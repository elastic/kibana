/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assign, cloneDeep, defaults } from 'lodash';
import type { SavedObjectReference, SavedObjectsClientContract } from 'kibana/public';
import { SavedObjectNotFound } from '../../../../plugins/kibana_utils/public';
import {
  extractSearchSourceReferences,
  injectSearchSourceReferences,
  parseSearchSourceJSON,
} from '../../../../plugins/data/public';
import { checkForDuplicateTitle } from '../../../../plugins/saved_objects/public';
import type { ISavedVis, SerializedVis } from '../types';
// @ts-ignore
import { updateOldState } from '../legacy/vis_update_state';
import { injectReferences, extractReferences } from './saved_visualization_references';

const SAVED_VIS_TYPE = 'visualization';

const getDefaults = (opts: Record<string, unknown>) => ({
  title: '',
  visState: !opts.type ? null : { type: opts.type },
  uiStateJSON: '{}',
  description: '',
  savedSearchId: opts.savedSearchId,
  version: 1,
});

export function urlFor(id: string) {
  return `#/edit/${encodeURIComponent(id)}`;
}

export function mapHitSource(
  visTypes: any,
  source: Record<string, any>,
  id: string,
  references: SavedObjectReference[] = []
) {
  source.id = id;
  source.references = references;
  source.url = urlFor(id);

  let typeName = source.typeName;
  if (source.visState) {
    try {
      typeName = JSON.parse(String(source.visState)).type;
    } catch (e) {
      /* missing typename handled below */
    }
  }

  if (!typeName || !visTypes.get(typeName)) {
    source.error = 'Unknown visualization type';
    return source;
  }

  source.type = visTypes.get(typeName);
  source.savedObjectType = 'visualization';
  source.icon = source.type.icon;
  source.image = source.type.image;
  source.typeTitle = source.type.title;
  source.editUrl = `/edit/${id}`;

  return source;
}

export const convertToSerializedVis = (savedVis: ISavedVis): SerializedVis => {
  const { id, title, description, visState, uiStateJSON, searchSourceFields } = savedVis;

  const aggs = searchSourceFields && searchSourceFields.index ? visState.aggs || [] : visState.aggs;

  return {
    id,
    title,
    type: visState.type,
    description,
    params: visState.params,
    uiState: JSON.parse(uiStateJSON || '{}'),
    data: {
      aggs,
      searchSource: searchSourceFields!,
      savedSearchId: savedVis.savedSearchId,
    },
  };
};

export const convertFromSerializedVis = (vis: SerializedVis): ISavedVis => {
  return {
    id: vis.id,
    title: vis.title,
    description: vis.description,
    visState: {
      title: vis.title,
      type: vis.type,
      aggs: vis.data.aggs,
      params: vis.params,
    },
    uiStateJSON: JSON.stringify(vis.uiState),
    searchSourceFields: vis.data.searchSource,
    savedSearchId: vis.data.savedSearchId,
  };
};

export async function getSavedVisualization(
  services: any,
  opts?: any
) {
  if (typeof opts !== 'object') {
    opts = { id: opts };
  }

  const id = (opts.id as string) || '';
  const savedObject = {
    id,
    displayName: SAVED_VIS_TYPE,
    getEsType: () => SAVED_VIS_TYPE,
    getDisplayName: () => SAVED_VIS_TYPE,
    searchSource: opts.searchSource ? services.search.searchSource.createEmpty() : undefined,
  } as { [key: string]: any };
  
  const defaultsProps = getDefaults(opts);

  if (!id) {
    assign(savedObject, defaultsProps);
    return Promise.resolve(savedObject);
  }

  const resp = await services.savedObjectsClient.get<Record<string, unknown>>(SAVED_VIS_TYPE, id);

  if (!resp._version) {
    throw new SavedObjectNotFound(SAVED_VIS_TYPE, id || '');
  }

  savedObject._source = cloneDeep(resp.attributes);

  if (savedObject._source.visState) {
    savedObject._source.visState = JSON.parse(savedObject._source.visState);
  }

  // assign the defaults to the response
  defaults(savedObject._source, defaultsProps);

  assign(savedObject, savedObject._source);
  savedObject.lastSavedTitle = savedObject.title;

  const meta = savedObject._source.kibanaSavedObjectMeta || {};

  if (meta.searchSourceJSON) {
    try {
      let searchSourceValues = parseSearchSourceJSON(meta.searchSourceJSON);

      if (opts.searchSource) {
        searchSourceValues = injectSearchSourceReferences(
          searchSourceValues as any,
          resp.references
        );
        savedObject.searchSource = await services.search.searchSource.create(
          searchSourceValues
        );
      } else {
        savedObject.searchSourceFields = searchSourceValues;
      }
    } catch (error: any) {
      if (
        error.constructor.name === 'SavedObjectNotFound' &&
        error.savedObjectType === 'index-pattern'
      ) {
        // if parsing the search source fails because the index pattern wasn't found,
        // remember the reference - this is required for error handling on legacy imports
        savedObject.unresolvedIndexPatternReference = {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          id: JSON.parse(meta.searchSourceJSON).index,
          type: 'index-pattern',
        };
      }

      throw error;
    }
  }

  if (resp.references && resp.references.length > 0) {
    injectReferences(savedObject, resp.references);
  }

  savedObject.visState = await updateOldState(savedObject.visState);
  if (savedObject.searchSourceFields?.index) {
    await services.dataViews.get(savedObject.searchSourceFields.index as any);
  }

  return savedObject;
}

export async function saveVisualization(
  savedObject: any,
  {
    confirmOverwrite = false,
    isTitleDuplicateConfirmed = false,
    onTitleDuplicate,
  }: any = {},
  services: {
    savedObjectsClient: SavedObjectsClientContract;
  }
) {
  // Save the original id in case the save fails.
  const originalId = savedObject.id;
  // Read https://github.com/elastic/kibana/issues/9056 and
  // https://github.com/elastic/kibana/issues/9012 for some background into why this copyOnSave variable
  // exists.
  // The goal is to move towards a better rename flow, but since our users have been conditioned
  // to expect a 'save as' flow during a rename, we are keeping the logic the same until a better
  // UI/UX can be worked out.
  if (savedObject.copyOnSave) {
    delete savedObject.id;
  }

  let attributes: any = {
    visState: JSON.stringify(savedObject.visState),
    title: savedObject.title,
    uiStateJSON: savedObject.uiStateJSON,
    description: savedObject.description,
    savedSearchId: savedObject.savedSearchId,
    version: savedObject.version,
  };
  let references: any = [];

  if (savedObject.searchSource) {
    const { searchSourceJSON, references: searchSourceReferences } =
      savedObject.searchSource.serialize();
    attributes.kibanaSavedObjectMeta = { searchSourceJSON };
    references.push(...searchSourceReferences);
  }

  if (savedObject.searchSourceFields) {
    const [searchSourceFields, searchSourceReferences] = extractSearchSourceReferences(
      savedObject.searchSourceFields
    );
    const searchSourceJSON = JSON.stringify(searchSourceFields);
    attributes.kibanaSavedObjectMeta = { searchSourceJSON };
    references.push(...searchSourceReferences);
  }

  if (savedObject.unresolvedIndexPatternReference) {
    references.push(savedObject.unresolvedIndexPatternReference);
  }

  const extractedRefs = extractReferences({ attributes, references });

  if (!extractedRefs.references) {
    throw new Error('References not returned from extractReferences');
  }

  try {
    await checkForDuplicateTitle(
      savedObject as any,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
      services as any
    );
    savedObject.isSaving = true;

    const createOpt = {
      id: savedObject.id,
      migrationVersion: savedObject.migrationVersion,
      references: extractedRefs.references,
    };
    const resp = await services.savedObjectsClient.create(SAVED_VIS_TYPE, extractedRefs.attributes, {
      ...createOpt,
      overwrite: true,
    });

    savedObject.id = resp.id;
    savedObject.isSaving = false;
    savedObject.lastSavedTitle = savedObject.title;
    return savedObject.id;
  } catch (err) {
    savedObject.isSaving = false;
    savedObject.id = originalId;
    // if (isErrorNonFatal(err)) {
    //   return '';
    // }
    return Promise.reject(err);
  }
}
