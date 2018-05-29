/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectNotFound } from 'ui/errors';

async function getSavedObject(doc, services) {
  const service = services.find(service => service.type === doc._type);
  if (!service) {
    return;
  }

  const obj = await service.get();
  obj.id = doc._id;
  return obj;
}

async function importIndexPattern(doc, indexPatterns, overwriteAll) {
  // TODO: consolidate this is the code in create_index_pattern_wizard.js
  const emptyPattern = await indexPatterns.get();
  Object.assign(emptyPattern, {
    id: doc._id,
    title: doc._source.title,
    timeFieldName: doc._source.timeFieldName,
  });
  const newId = await emptyPattern.create(true, !overwriteAll);
  indexPatterns.cache.clear(newId);
  return newId;
}

async function importDocument(obj, doc, overwriteAll) {
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

export async function resolveIndexPatternConflicts(
  resolutions,
  conflictedIndexPatterns,
  overwriteAll
) {
  let importCount = 0;
  await awaitEachItemInParallel(conflictedIndexPatterns, async ({ obj }) => {
    let oldIndexId = obj.searchSource.getOwn('index');
    // Depending on the object, this can either be the raw id or the actual index pattern object
    if (typeof oldIndexId !== 'string') {
      oldIndexId = oldIndexId.id;
    }
    const resolution = resolutions.find(({ oldId }) => oldId === oldIndexId);
    if (!resolution) {
      // The user decided to skip this conflict so do nothing
      return;
    }
    const newIndexId = resolution.newId;
    await obj.hydrateIndexPattern(newIndexId);
    if (await saveObject(obj, overwriteAll)) {
      importCount++;
    }
  });
  return importCount;
}

export async function saveObjects(objs, overwriteAll) {
  let importCount = 0;
  await awaitEachItemInParallel(
    objs,
    async obj => {
      if (await saveObject(obj, overwriteAll)) {
        importCount++;
      }
    }
  );
  return importCount;
}

export async function saveObject(obj, overwriteAll) {
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

export async function resolveSavedSearches(
  savedSearches,
  services,
  indexPatterns,
  overwriteAll
) {
  let importCount = 0;
  await awaitEachItemInParallel(savedSearches, async searchDoc => {
    const obj = await getSavedObject(searchDoc, services);
    if (!obj) {
      // Just ignore?
      return;
    }
    if (await importDocument(obj, searchDoc, overwriteAll)) {
      importCount++;
    }
  });
  return importCount;
}

export async function resolveSavedObjects(
  savedObjects,
  overwriteAll,
  services,
  indexPatterns
) {
  const docTypes = groupByType(savedObjects);

  // Keep track of how many we actually import because the user
  // can cancel an override
  let importedObjectCount = 0;

  // Start with the index patterns since everything is dependent on them
  await awaitEachItemInParallel(
    docTypes.indexPatterns,
    async indexPatternDoc => {
      if (await importIndexPattern(indexPatternDoc, indexPatterns, overwriteAll)) {
        importedObjectCount++;
      }
    }
  );

  // We want to do the same for saved searches, but we want to keep them separate because they need
  // to be applied _first_ because other saved objects can be depedent on those saved searches existing
  const conflictedSearchDocs = [];
  // Keep a record of the index patterns assigned to our imported saved objects that do not
  // exist. We will provide a way for the user to manually select a new index pattern for those
  // saved objects.
  const conflictedIndexPatterns = [];
  // It's possible to have saved objects that link to saved searches which then link to index patterns
  // and those could error out, but the error comes as an index pattern not found error. We can't resolve
  // those the same as way as normal index pattern not found errors, but when those are fixed, it's very
  // likely that these saved objects will work once resaved so keep them around to resave them.
  const conflictedSavedObjectsLinkedToSavedSearches = [];

  await awaitEachItemInParallel(docTypes.searches, async searchDoc => {
    const obj = await getSavedObject(searchDoc, services);

    try {
      if (await importDocument(obj, searchDoc, overwriteAll)) {
        importedObjectCount++;
      }
    } catch (err) {
      if (err instanceof SavedObjectNotFound) {
        if (err.savedObjectType === 'index-pattern') {
          conflictedIndexPatterns.push({ obj, doc: searchDoc });
        } else {
          conflictedSearchDocs.push(searchDoc);
        }
      }
    }
  });

  await awaitEachItemInParallel(docTypes.other, async otherDoc => {
    const obj = await getSavedObject(otherDoc, services);

    try {
      if (await importDocument(obj, otherDoc, overwriteAll)) {
        importedObjectCount++;
      }
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
    importedObjectCount,
  };
}
