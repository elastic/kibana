import { SavedObjectNotFound } from 'ui/errors';

async function getSavedObject(doc, services) {
  const service = services.find(service => service.type === doc._type);

  if (!service) {
    // console.warn('Unable to find service for doc', doc);
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

async function importDocument(obj, doc, overwriteAll) {
  await obj.applyESResp(doc);
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

function groupByType(docs) {
  const defaultDocTypes = {
    searches: [],
    other: [],
  };

  return docs.reduce((types, doc) => {
    switch (doc._type) {
      case 'search':
        types.searches.push(doc);
        break;
      default:
        types.other.push(doc);
    }
    return types;
  }, defaultDocTypes);
}

async function awaitEachItemInParallel(list, op) {
  const promises = [];
  for (const item of list) {
    promises.push(op(item));
  }
  return await Promise.all(promises);
}

export async function resolveConflicts(
  resolutions,
  conflictedIndexPatterns,
  overwriteAll
) {
  await awaitEachItemInParallel(conflictedIndexPatterns, async ({ obj }) => {
    const oldIndexId = obj.searchSource.getOwn('index');
    const newIndexId = resolutions.find(({ oldId }) => oldId === oldIndexId)
      .newId;
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
  await awaitEachItemInParallel(objs, async obj => {
    return await saveObject(obj, overwriteAll);
  });
}

export async function saveObject(obj, overwriteAll) {
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

export async function resolveSavedSearches(
  savedSearches,
  services,
  overwriteAll
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
  services
) {
  const docTypes = groupByType(savedObjects);

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
