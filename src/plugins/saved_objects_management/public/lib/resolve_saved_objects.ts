/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { OverlayStart, SavedObjectReference } from 'src/core/public';
import { SavedObject, SavedObjectLoader } from '../../../saved_objects/public';
import { isSavedObjectNotFoundError } from '../../../kibana_utils/common';
import {
  DataPublicPluginStart,
  IndexPatternsContract,
  injectSearchSourceReferences,
  IndexPatternSpec,
} from '../../../data/public';
import { FailedImport } from './process_import_response';
import { DuplicateDataViewError, IndexPattern } from '../../../data/public';

type SavedObjectsRawDoc = Record<string, any>;

async function getSavedObject(doc: SavedObjectsRawDoc, services: SavedObjectLoader[]) {
  const service = services.find((s) => s.type === doc._type);
  if (!service) {
    return;
  }

  const obj = await service.get();
  obj.id = doc._id;
  obj.migrationVersion = doc._migrationVersion;
  return obj;
}

function addJsonFieldToIndexPattern(
  target: Record<string, any>,
  sourceString: string,
  fieldName: string,
  indexName: string
) {
  if (sourceString) {
    try {
      target[fieldName] = JSON.parse(sourceString);
    } catch (error) {
      throw new Error(
        i18n.translate('savedObjectsManagement.parsingFieldErrorMessage', {
          defaultMessage:
            'Error encountered parsing {fieldName} for index pattern {indexName}: {errorMessage}',
          values: {
            fieldName,
            indexName,
            errorMessage: error.message,
          },
        })
      );
    }
  }
}
async function importIndexPattern(
  doc: SavedObjectsRawDoc,
  indexPatterns: IndexPatternsContract,
  overwriteAll: boolean = false,
  openConfirm: OverlayStart['openConfirm']
) {
  // TODO: consolidate this is the code in create_index_pattern_wizard.js
  const { title, timeFieldName, fields, fieldFormatMap, sourceFilters, type, typeMeta } =
    doc._source;
  const indexPatternSpec: IndexPatternSpec = {
    id: doc._id,
    title,
    timeFieldName,
  };
  let emptyPattern: IndexPattern;
  if (type) {
    indexPatternSpec.type = type;
  }
  addJsonFieldToIndexPattern(indexPatternSpec, fields, 'fields', title);
  addJsonFieldToIndexPattern(indexPatternSpec, fieldFormatMap, 'fieldFormatMap', title);
  addJsonFieldToIndexPattern(indexPatternSpec, sourceFilters, 'sourceFilters', title);
  addJsonFieldToIndexPattern(indexPatternSpec, typeMeta, 'typeMeta', title);
  try {
    emptyPattern = await indexPatterns.createAndSave(indexPatternSpec, overwriteAll, true);
  } catch (err) {
    if (err instanceof DuplicateDataViewError) {
      // We can override and we want to prompt for confirmation
      const isConfirmed = await openConfirm(
        i18n.translate('savedObjectsManagement.indexPattern.confirmOverwriteLabel', {
          values: { title },
          defaultMessage: "Are you sure you want to overwrite '{title}'?",
        }),
        {
          title: i18n.translate('savedObjectsManagement.indexPattern.confirmOverwriteTitle', {
            defaultMessage: 'Overwrite {type}?',
            values: { type },
          }),
          confirmButtonText: i18n.translate(
            'savedObjectsManagement.indexPattern.confirmOverwriteButton',
            {
              defaultMessage: 'Overwrite',
            }
          ),
        }
      );

      if (isConfirmed) {
        emptyPattern = await indexPatterns.createAndSave(indexPatternSpec, true, true);
      } else {
        return;
      }
    }
  }

  indexPatterns.clearCache(emptyPattern!.id);
  return emptyPattern!.id;
}

async function importDocument(obj: SavedObject, doc: SavedObjectsRawDoc, overwriteAll: boolean) {
  await obj.applyESResp({
    references: doc._references || [],
    ...cloneDeep(doc),
  });
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

function groupByType(docs: SavedObjectsRawDoc[]): Record<string, SavedObjectsRawDoc[]> {
  const defaultDocTypes = {
    searches: [],
    indexPatterns: [],
    other: [],
  } as Record<string, SavedObjectsRawDoc[]>;

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

export async function resolveIndexPatternConflicts(
  resolutions: Array<{ oldId: string; newId: string }>,
  conflictedIndexPatterns: any[],
  overwriteAll: boolean,
  dependencies: {
    indexPatterns: IndexPatternsContract;
    search: DataPublicPluginStart['search'];
  }
) {
  let importCount = 0;

  for (const { obj, doc } of conflictedIndexPatterns) {
    const serializedSearchSource = JSON.parse(
      doc._source.kibanaSavedObjectMeta?.searchSourceJSON || '{}'
    );
    const oldIndexId = serializedSearchSource.index;
    let allResolved = true;
    const inlineResolution = resolutions.find(({ oldId }) => oldId === oldIndexId);
    if (inlineResolution) {
      serializedSearchSource.index = inlineResolution.newId;
    } else {
      allResolved = false;
    }

    // Resolve filter index reference:
    const filter = (serializedSearchSource.filter || []).map((f: any) => {
      if (!(f.meta && f.meta.index)) {
        return f;
      }

      const resolution = resolutions.find(({ oldId }) => oldId === f.meta.index);
      return resolution ? { ...f, ...{ meta: { ...f.meta, index: resolution.newId } } } : f;
    });

    if (filter.length > 0) {
      serializedSearchSource.filter = filter;
    }

    const replacedReferences = (doc._references || []).map((reference: SavedObjectReference) => {
      const resolution = resolutions.find(({ oldId }) => oldId === reference.id);
      if (resolution) {
        return { ...reference, id: resolution.newId };
      } else {
        allResolved = false;
      }

      return reference;
    });

    const serializedSearchSourceWithInjectedReferences = injectSearchSourceReferences(
      serializedSearchSource,
      replacedReferences
    );

    if (!allResolved) {
      // The user decided to skip this conflict so do nothing
      continue;
    }
    obj.searchSource = await dependencies.search.searchSource.create(
      serializedSearchSourceWithInjectedReferences
    );
    if (await saveObject(obj, overwriteAll)) {
      importCount++;
    }
  }
  return importCount;
}

export async function saveObjects(objs: SavedObject[], overwriteAll: boolean) {
  let importCount = 0;
  for (const obj of objs) {
    if (await saveObject(obj, overwriteAll)) {
      importCount++;
    }
  }
  return importCount;
}

export async function saveObject(obj: SavedObject, overwriteAll: boolean) {
  return await obj.save({ confirmOverwrite: !overwriteAll });
}

export async function resolveSavedSearches(
  savedSearches: any[],
  services: SavedObjectLoader[],
  indexPatterns: IndexPatternsContract,
  overwriteAll: boolean
) {
  let importCount = 0;
  for (const searchDoc of savedSearches) {
    const obj = await getSavedObject(searchDoc, services);
    if (!obj) {
      // Just ignore?
      continue;
    }
    if (await importDocument(obj, searchDoc, overwriteAll)) {
      importCount++;
    }
  }
  return importCount;
}

export async function resolveSavedObjects(
  savedObjects: SavedObjectsRawDoc[],
  overwriteAll: boolean,
  services: SavedObjectLoader[],
  indexPatterns: IndexPatternsContract,
  confirmModalPromise: OverlayStart['openConfirm']
) {
  const docTypes = groupByType(savedObjects);

  // Keep track of how many we actually import because the user
  // can cancel an override
  let importedObjectCount = 0;
  const failedImports: FailedImport[] = [];
  // Start with the index patterns since everything is dependent on them
  // As the confirmation opens a modal, and as we only allow one modal at a time
  // (opening a new one close the previous with a rejection)
  // we can't do that in parallel
  for (const indexPatternDoc of docTypes.indexPatterns) {
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
      failedImports.push({ obj: indexPatternDoc as any, error });
    }
  }

  // We want to do the same for saved searches, but we want to keep them separate because they need
  // to be applied _first_ because other saved objects can be dependent on those saved searches existing
  const conflictedSearchDocs: any[] = [];
  // Keep a record of the index patterns assigned to our imported saved objects that do not
  // exist. We will provide a way for the user to manually select a new index pattern for those
  // saved objects.
  const conflictedIndexPatterns: any[] = [];
  // Keep a record of any objects which fail to import for unknown reasons.

  // It's possible to have saved objects that link to saved searches which then link to index patterns
  // and those could error out, but the error comes as an index pattern not found error. We can't resolve
  // those the same as way as normal index pattern not found errors, but when those are fixed, it's very
  // likely that these saved objects will work once resaved so keep them around to resave them.
  const conflictedSavedObjectsLinkedToSavedSearches: any[] = [];

  for (const searchDoc of docTypes.searches) {
    const obj = await getSavedObject(searchDoc, services);

    try {
      if (await importDocument(obj, searchDoc, overwriteAll)) {
        importedObjectCount++;
      }
    } catch (error) {
      if (isSavedObjectNotFoundError(error)) {
        if (error.savedObjectType === 'index-pattern') {
          conflictedIndexPatterns.push({ obj, doc: searchDoc });
        } else {
          conflictedSearchDocs.push(searchDoc);
        }
      } else {
        failedImports.push({ obj, error });
      }
    }
  }

  for (const otherDoc of docTypes.other) {
    const obj = await getSavedObject(otherDoc, services);

    try {
      if (await importDocument(obj, otherDoc, overwriteAll)) {
        importedObjectCount++;
      }
    } catch (error) {
      const isIndexPatternNotFound =
        isSavedObjectNotFoundError(error) && error.savedObjectType === 'index-pattern';
      if (isIndexPatternNotFound && obj.savedSearchId) {
        conflictedSavedObjectsLinkedToSavedSearches.push(obj);
      } else if (isIndexPatternNotFound) {
        conflictedIndexPatterns.push({ obj, doc: otherDoc });
      } else {
        failedImports.push({ obj, error });
      }
    }
  }

  return {
    conflictedIndexPatterns,
    conflictedSavedObjectsLinkedToSavedSearches,
    conflictedSearchDocs,
    importedObjectCount,
    failedImports,
  };
}
