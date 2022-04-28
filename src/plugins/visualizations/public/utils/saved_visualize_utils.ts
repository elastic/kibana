/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type {
  SavedObjectsFindOptionsReference,
  SavedObjectsFindOptions,
  SavedObjectsClientContract,
  SavedObjectAttributes,
  SavedObjectReference,
} from '@kbn/core/public';
import type { OverlayStart } from '@kbn/core/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import {
  extractSearchSourceReferences,
  injectSearchSourceReferences,
  parseSearchSourceJSON,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { saveWithConfirmation, checkForDuplicateTitle } from './saved_objects_utils';
import { VisualizationsAppExtension } from '../vis_types/vis_type_alias_registry';
import type {
  VisSavedObject,
  SerializedVis,
  ISavedVis,
  SaveVisOptions,
  GetVisOptions,
} from '../types';
import type { TypesStart, BaseVisType } from '../vis_types';
// @ts-ignore
import { updateOldState } from '../legacy/vis_update_state';
import { injectReferences, extractReferences } from './saved_visualization_references';
import { OVERWRITE_REJECTED, SAVE_DUPLICATE_REJECTED } from './saved_objects_utils/constants';

export const SAVED_VIS_TYPE = 'visualization';

const getDefaults = (opts: GetVisOptions) => ({
  title: '',
  visState: !opts.type ? null : { type: opts.type },
  uiStateJSON: '{}',
  description: '',
  savedSearchId: opts.savedSearchId,
  version: 1,
});

export function getFullPath(id: string) {
  return `/app/visualize#/edit/${id}`;
}

export function urlFor(id: string) {
  return `#/edit/${encodeURIComponent(id)}`;
}

export function mapHitSource(
  visTypes: Pick<TypesStart, 'get'>,
  {
    attributes,
    id,
    references,
  }: {
    attributes: SavedObjectAttributes;
    id: string;
    references: SavedObjectReference[];
  }
) {
  const newAttributes: {
    id: string;
    references: SavedObjectReference[];
    url: string;
    savedObjectType?: string;
    editUrl?: string;
    type?: BaseVisType;
    icon?: BaseVisType['icon'];
    image?: BaseVisType['image'];
    typeTitle?: BaseVisType['title'];
    error?: string;
  } = {
    id,
    references,
    url: urlFor(id),
    ...attributes,
  };

  let typeName = attributes.typeName;
  if (attributes.visState) {
    try {
      typeName = JSON.parse(String(attributes.visState)).type;
    } catch (e) {
      /* missing typename handled below */
    }
  }

  if (!typeName || !visTypes.get(typeName as string)) {
    newAttributes.error = 'Unknown visualization type';
    return newAttributes;
  }

  newAttributes.type = visTypes.get(typeName as string);
  newAttributes.savedObjectType = 'visualization';
  newAttributes.icon = newAttributes.type?.icon;
  newAttributes.image = newAttributes.type?.image;
  newAttributes.typeTitle = newAttributes.type?.title;
  newAttributes.editUrl = `/edit/${id}`;

  return newAttributes;
}

export const convertToSerializedVis = (savedVis: VisSavedObject): SerializedVis => {
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

export async function findListItems(
  savedObjectsClient: SavedObjectsClientContract,
  visTypes: Pick<TypesStart, 'get' | 'getAliases'>,
  search: string,
  size: number,
  references?: SavedObjectsFindOptionsReference[]
) {
  const visAliases = visTypes.getAliases();
  const extensions = visAliases
    .map((v) => v.appExtensions?.visualizations)
    .filter(Boolean) as VisualizationsAppExtension[];
  const extensionByType = extensions.reduce((acc, m) => {
    return m!.docTypes.reduce((_acc, type) => {
      acc[type] = m;
      return acc;
    }, acc);
  }, {} as { [visType: string]: VisualizationsAppExtension });
  const searchOption = (field: string, ...defaults: string[]) =>
    _(extensions).map(field).concat(defaults).compact().flatten().uniq().value() as string[];
  const searchOptions: SavedObjectsFindOptions = {
    type: searchOption('docTypes', 'visualization'),
    searchFields: searchOption('searchFields', 'title^3', 'description'),
    search: search ? `${search}*` : undefined,
    perPage: size,
    page: 1,
    defaultSearchOperator: 'AND' as 'AND',
    hasReference: references,
  };

  const { total, savedObjects } = await savedObjectsClient.find<SavedObjectAttributes>(
    searchOptions
  );

  return {
    total,
    hits: savedObjects.map((savedObject) => {
      const config = extensionByType[savedObject.type];

      if (config) {
        return {
          ...config.toListItem(savedObject),
          references: savedObject.references,
        };
      } else {
        return mapHitSource(visTypes, savedObject);
      }
    }),
  };
}

export async function getSavedVisualization(
  services: {
    savedObjectsClient: SavedObjectsClientContract;
    search: DataPublicPluginStart['search'];
    dataViews: DataPublicPluginStart['dataViews'];
    spaces?: SpacesPluginStart;
    savedObjectsTagging?: SavedObjectsTaggingApi;
  },
  opts?: GetVisOptions | string
): Promise<VisSavedObject> {
  if (typeof opts !== 'object') {
    opts = { id: opts } as GetVisOptions;
  }

  const id = (opts.id as string) || '';
  const savedObject = {
    id,
    migrationVersion: opts.migrationVersion,
    displayName: SAVED_VIS_TYPE,
    getEsType: () => SAVED_VIS_TYPE,
    getDisplayName: () => SAVED_VIS_TYPE,
    searchSource: opts.searchSource ? services.search.searchSource.createEmpty() : undefined,
  } as VisSavedObject;
  const defaultsProps = getDefaults(opts);

  if (!id) {
    Object.assign(savedObject, defaultsProps);
    return savedObject;
  }

  const {
    saved_object: resp,
    outcome,
    alias_target_id: aliasTargetId,
    alias_purpose: aliasPurpose,
  } = await services.savedObjectsClient.resolve<SavedObjectAttributes>(SAVED_VIS_TYPE, id);

  if (!resp._version) {
    throw new SavedObjectNotFound(SAVED_VIS_TYPE, id || '');
  }

  const attributes = _.cloneDeep(resp.attributes);

  if (attributes.visState && typeof attributes.visState === 'string') {
    attributes.visState = JSON.parse(attributes.visState);
  }

  // assign the defaults to the response
  _.defaults(attributes, defaultsProps);

  Object.assign(savedObject, attributes);
  savedObject.lastSavedTitle = savedObject.title;

  savedObject.sharingSavedObjectProps = {
    aliasTargetId,
    outcome,
    aliasPurpose,
    errorJSON:
      outcome === 'conflict' && services.spaces
        ? JSON.stringify({
            targetType: SAVED_VIS_TYPE,
            sourceId: id,
            targetSpace: (await services.spaces.getActiveSpace()).id,
          })
        : undefined,
  };

  const meta = (attributes.kibanaSavedObjectMeta || {}) as SavedObjectAttributes;

  if (meta.searchSourceJSON) {
    try {
      let searchSourceValues = parseSearchSourceJSON(meta.searchSourceJSON as string);

      if (opts.searchSource) {
        searchSourceValues = injectSearchSourceReferences(
          searchSourceValues as any,
          resp.references
        );
        savedObject.searchSource = await services.search.searchSource.create(searchSourceValues);
      } else {
        savedObject.searchSourceFields = searchSourceValues;
      }
    } catch (error: any) {
      throw error;
    }
  }

  if (resp.references && resp.references.length > 0) {
    injectReferences(savedObject, resp.references);
  }

  if (services.savedObjectsTagging) {
    savedObject.tags = services.savedObjectsTagging.ui.getTagIdsFromReferences(resp.references);
  }

  savedObject.visState = await updateOldState(savedObject.visState);
  if (savedObject.searchSourceFields?.index) {
    await services.dataViews.get(savedObject.searchSourceFields.index as any);
  }

  return savedObject;
}

export async function saveVisualization(
  savedObject: VisSavedObject,
  {
    confirmOverwrite = false,
    isTitleDuplicateConfirmed = false,
    onTitleDuplicate,
    copyOnSave = false,
  }: SaveVisOptions,
  services: {
    savedObjectsClient: SavedObjectsClientContract;
    overlays: OverlayStart;
    savedObjectsTagging?: SavedObjectsTaggingApi;
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
  if (copyOnSave) {
    delete savedObject.id;
  }

  const attributes: SavedObjectAttributes = {
    visState: JSON.stringify(savedObject.visState),
    title: savedObject.title,
    uiStateJSON: savedObject.uiStateJSON,
    description: savedObject.description,
    savedSearchId: savedObject.savedSearchId,
    version: savedObject.version,
  };
  let references: SavedObjectReference[] = [];

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

  if (services.savedObjectsTagging) {
    references = services.savedObjectsTagging.ui.updateTagsReferences(
      references,
      savedObject.tags || []
    );
  }

  const extractedRefs = extractReferences({ attributes, references });

  if (!extractedRefs.references) {
    throw new Error('References not returned from extractReferences');
  }

  try {
    await checkForDuplicateTitle(
      {
        ...savedObject,
        copyOnSave,
      } as any,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
      services as any
    );
    const createOpt = {
      id: savedObject.id,
      migrationVersion: savedObject.migrationVersion,
      references: extractedRefs.references,
    };
    const resp = confirmOverwrite
      ? await saveWithConfirmation(attributes, savedObject, createOpt, services)
      : await services.savedObjectsClient.create(SAVED_VIS_TYPE, extractedRefs.attributes, {
          ...createOpt,
          overwrite: true,
        });

    savedObject.id = resp.id;
    savedObject.lastSavedTitle = savedObject.title;
    return savedObject.id;
  } catch (err: any) {
    savedObject.id = originalId;
    if (err && [OVERWRITE_REJECTED, SAVE_DUPLICATE_REJECTED].includes(err.message)) {
      return '';
    }
    return Promise.reject(err);
  }
}
