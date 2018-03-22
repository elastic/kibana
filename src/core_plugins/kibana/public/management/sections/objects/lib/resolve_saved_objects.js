import { SavedObjectNotFound } from 'ui/errors';

async function getSavedObject(doc, services) {
  const service = services.find(service => service.type === doc._type);

  if (!service) {
    // const msg = `Skipped import of "${doc._source.title}" (${doc._id})`;
    // const reason = `Invalid type: "${doc._type}"`;

    // console.warn(`${msg}, ${reason}`, {
    // lifetime: 0,
    // });
    return;
  }

  const obj = await service.get();
  obj.id = doc._id;
  return obj;
}

async function getIndexPattern(doc, indexPatterns) {
  let indexPattern;

  try {
    indexPattern = await indexPatterns.get(doc._id);
  }
  catch (err) {
    // Maybe it's store as the title?
    try {
      indexPattern = await indexPatterns.get(doc._source.title);
    }
    catch (err2) {
      // Do nothing...
    }
  }

  return indexPattern;
}

async function importIndexPattern(doc, indexPatterns) {
  // TODO: consolidate this is the code in create_index_pattern_wizard.js
  const emptyPattern = await indexPatterns.get();
  Object.assign(emptyPattern, {
    id: doc._id,
    title: doc._source.title,
    timeFieldName: doc._source.timeFieldName,
  });
  const newId = await emptyPattern.create();
  indexPatterns.cache.clear(newId);
  return newId;
}

async function importDocument(obj, doc, overwriteAll) {
  // doc.found = true;
  await obj.applyESResp(doc);
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

function groupByType(docs) {
  const defaultDocTypes = {
    searches: [],
    indexPatterns: [],
    other: [],
  };

  return docs.reduce((types, doc) => {
    switch (doc._type) {
      case 'search':
        types.searches.push(doc);
        break;
      case 'index-pattern':
        types.indexPatterns.push(doc);
        break;
      default:
        types.other.push(doc);
    }
    return types;
  }, defaultDocTypes);
}

async function awaitEachItemInParallel(list, op) {
  return await Promise.all(list.map(item => op(item)));
}

export async function resolveConflicts(
  resolutions,
  conflictedIndexPatterns,
  overwriteAll
) {
  await awaitEachItemInParallel(conflictedIndexPatterns, async ({ obj }) => {
    const oldIndexId = obj.searchSource.getOwn('index');
    const newIndexId = resolutions.find(({ oldId }) => oldId === oldIndexId).newId;
    // If the user did not select a new index pattern in the modal, the id
    // will be same as before, so don't try to update it
    if (newIndexId === oldIndexId) {
      return;
    }
    await obj.hydrateIndexPattern(newIndexId);
    return await saveObject(obj, overwriteAll);
  });
}

export async function saveObjects(objs, overwriteAll) {
  await awaitEachItemInParallel(objs, async obj => await saveObject(obj, overwriteAll));
}

export async function saveObject(obj, overwriteAll) {
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

export async function resolveSavedSearches(
  savedSearches,
  services,
  indexPatterns,
  overwriteAll,
) {
  await awaitEachItemInParallel(savedSearches, async searchDoc => {
    const obj = await getSavedObject(searchDoc, services);
    if (!obj) {
      // Just ignore?
      return;
    }
    await importDocument(obj, searchDoc, overwriteAll);
  });
}

export async function resolveSavedObjects(
  savedObjects,
  overwriteAll,
  services,
  indexPatterns
) {
  const docTypes = groupByType(savedObjects);

  // Start with the index patterns since everything is dependent on them
  await awaitEachItemInParallel(docTypes.indexPatterns, async indexPatternDoc => {
    const obj = await getIndexPattern(indexPatternDoc, indexPatterns);
    // TODO: handle overwriteAll
    if (obj) {
      return;
    }
    await importIndexPattern(indexPatternDoc, indexPatterns);
  });

  // We want to do the same for saved searches, but we want to keep them separate because they need
  // to be applied _first_ because other saved objects can be depedent on those saved searches existing
  const conflictedSearchDocs = [];

  await awaitEachItemInParallel(docTypes.searches, async searchDoc => {
    const obj = await getSavedObject(searchDoc, services);

    try {
      await importDocument(obj, searchDoc, overwriteAll);
    } catch (err) {
      if (err instanceof SavedObjectNotFound) {
        conflictedSearchDocs.push(searchDoc);
      }
    }
  });

  // Keep a record of the index patterns assigned to our imported saved objects that do not
  // exist. We will provide a way for the user to manually select a new index pattern for those
  // saved objects.
  const conflictedIndexPatterns = [];
  // It's possbile to have saved objects that link to saved searches which then link to index patterns
  // and those could error out, but the error comes as an index pattern not found error. We can't resolve
  // those the same as way as normal index pattern not found errors, but when those are fixed, it's very
  // likely that these saved objects will work once resaved so keep them around to resave them.
  const conflictedSavedObjectsLinkedToSavedSearches = [];

  await awaitEachItemInParallel(docTypes.other, async otherDoc => {
    const obj = await getSavedObject(otherDoc, services);

    try {
      await importDocument(obj, otherDoc, overwriteAll);
    } catch (err) {
      if (err instanceof SavedObjectNotFound) {
        if (err.savedObjectType === 'index-pattern') {
          if (obj.savedSearchId) {
            conflictedSavedObjectsLinkedToSavedSearches.push(obj);
          } else {
            conflictedIndexPatterns.push({ obj, doc: otherDoc });
          }
        }
      }
    }
  });

  return {
    conflictedIndexPatterns,
    conflictedSavedObjectsLinkedToSavedSearches,
    conflictedSearchDocs,
  };
}
