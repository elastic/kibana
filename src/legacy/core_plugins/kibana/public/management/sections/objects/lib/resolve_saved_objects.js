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
import { i18n } from '@kbn/i18n';

async function getSavedObject(doc, services) {
  const service = services.find(service => service.type === doc._type);
  if (!service) {
    return;
  }

  const obj = await service.get();
  obj.id = doc._id;
  obj.migrationVersion = doc._migrationVersion;
  return obj;
}

function addJsonFieldToIndexPattern(target, sourceString, fieldName, indexName) {
  if (sourceString) {
    try {
      target[fieldName] = JSON.parse(sourceString);
    } catch (error) {
      throw new Error(
        i18n.translate('kbn.management.objects.parsingFieldErrorMessage', {
          defaultMessage: 'Error encountered parsing {fieldName} for index pattern {indexName}: {errorMessage}',
          values: {
            fieldName,
            indexName,
            errorMessage: error.message,
          }
        }),
      );
    }
  }
}
async function importIndexPattern(doc, indexPatterns, overwriteAll, confirmModalPromise) {
  // TODO: consolidate this is the code in create_index_pattern_wizard.js
  const emptyPattern = await indexPatterns.get();
  const {
    title,
    timeFieldName,
    fields,
    fieldFormatMap,
    sourceFilters,
    type,
    typeMeta,
  } = doc._source;
  const importedIndexPattern = {
    id: doc._id,
    title,
    timeFieldName,
  };
  if (type) {
    importedIndexPattern.type = type;
  }
  addJsonFieldToIndexPattern(importedIndexPattern, fields, 'fields', title);
  addJsonFieldToIndexPattern(importedIndexPattern, fieldFormatMap, 'fieldFormatMap', title);
  addJsonFieldToIndexPattern(importedIndexPattern, sourceFilters, 'sourceFilters', title);
  addJsonFieldToIndexPattern(importedIndexPattern, typeMeta, 'typeMeta', title);
  Object.assign(emptyPattern, importedIndexPattern);

  let newId = await emptyPattern.create(overwriteAll);
  if (!newId) {
    // We can override and we want to prompt for confirmation
    try {
      await confirmModalPromise(
        i18n.translate('kbn.management.indexPattern.confirmOverwriteLabel', { values: { title: this.title },
          defaultMessage: 'Are you sure you want to overwrite \'{title}\'?' }),
        {
          title: i18n.translate('kbn.management.indexPattern.confirmOverwriteTitle', {
            defaultMessage: 'Overwrite {type}?',
            values: { type },
          }),
          confirmButtonText: i18n.translate('kbn.management.indexPattern.confirmOverwriteButton', { defaultMessage: 'Overwrite' }),
        }
      );
      newId = await emptyPattern.create(true);
    } catch (err) {
      return;
    }
  }
  indexPatterns.cache.clear(newId);
  return newId;
}

async function importDocument(obj, doc, overwriteAll) {
  await obj.applyESResp({
    references: doc._references || [],
    ...doc,
  });
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
    let oldIndexId = obj.searchSource.getOwnField('index');
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
  await awaitEachItemInParallel(objs, async obj => {
    if (await saveObject(obj, overwriteAll)) {
      importCount++;
    }
  });
  return importCount;
}

export async function saveObject(obj, overwriteAll) {
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

export async function resolveSavedSearches(savedSearches, services, indexPatterns, overwriteAll) {
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

export async function resolveSavedObjects(savedObjects, overwriteAll, services, indexPatterns, confirmModalPromise) {
  const docTypes = groupByType(savedObjects);

  // Keep track of how many we actually import because the user
  // can cancel an override
  let importedObjectCount = 0;
  const failedImports = [];
  // Start with the index patterns since everything is dependent on them
  await awaitEachItemInParallel(docTypes.indexPatterns, async indexPatternDoc => {
    try {
      const importedIndexPatternId = await importIndexPattern(
        indexPatternDoc,
        indexPatterns,
        overwriteAll,
        confirmModalPromise
      );
      if (importedIndexPatternId) {
        importedObjectCount++;
      }
    } catch (error) {
      failedImports.push({ indexPatternDoc, error });
    }
  });

  // We want to do the same for saved searches, but we want to keep them separate because they need
  // to be applied _first_ because other saved objects can be dependent on those saved searches existing
  const conflictedSearchDocs = [];
  // Keep a record of the index patterns assigned to our imported saved objects that do not
  // exist. We will provide a way for the user to manually select a new index pattern for those
  // saved objects.
  const conflictedIndexPatterns = [];
  // Keep a record of any objects which fail to import for unknown reasons.

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
    } catch (error) {
      if (error instanceof SavedObjectNotFound) {
        if (error.savedObjectType === 'index-pattern') {
          conflictedIndexPatterns.push({ obj, doc: searchDoc });
        } else {
          conflictedSearchDocs.push(searchDoc);
        }
      } else {
        failedImports.push({ obj, error });
      }
    }
  });

  await awaitEachItemInParallel(docTypes.other, async otherDoc => {
    const obj = await getSavedObject(otherDoc, services);

    try {
      if (await importDocument(obj, otherDoc, overwriteAll)) {
        importedObjectCount++;
      }
    } catch (error) {
      const isIndexPatternNotFound = error instanceof SavedObjectNotFound &&
        error.savedObjectType === 'index-pattern';
      if (isIndexPatternNotFound && obj.savedSearchId) {
        conflictedSavedObjectsLinkedToSavedSearches.push(obj);
      } else if (isIndexPatternNotFound) {
        conflictedIndexPatterns.push({ obj, doc: otherDoc });
      } else {
        failedImports.push({ obj, error });
      }
    }
  });

  return {
    conflictedIndexPatterns,
    conflictedSavedObjectsLinkedToSavedSearches,
    conflictedSearchDocs,
    importedObjectCount,
    failedImports,
  };
}
