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
} from 'kibana/public';
import type { ChromeStart, OverlayStart } from '../../../../core/public';
import { SavedObjectNotFound } from '../../../../plugins/kibana_utils/public';
import {
  extractSearchSourceReferences,
  injectSearchSourceReferences,
  parseSearchSourceJSON,
  DataPublicPluginStart,
} from '../../../../plugins/data/public';
import {
  checkForDuplicateTitle,
  saveWithConfirmation,
  isErrorNonFatal,
} from '../../../../plugins/saved_objects/public';
import { tagDecoratorConfig } from '../../../../plugins/saved_objects_tagging_oss/public';
import { getTypes, getSpaces } from '../services';
import { VisualizationsAppExtension } from '../vis_types/vis_type_alias_registry';
import type { VisSavedObject, SerializedVis, ISavedVis } from '../types';
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

export function getFullPath(id: string) {
  return `/app/visualize#/edit/${id}`;
}

export function urlFor(id: string) {
  return `#/edit/${encodeURIComponent(id)}`;
}

export function mapHitSource(
  visTypes: any,
  {
    attributes,
    id,
    references,
  }: {
    attributes: any;
    id: string;
    references: any;
  }
) {
  attributes.id = id;
  attributes.references = references;
  attributes.url = urlFor(id);

  let typeName = attributes.typeName;
  if (attributes.visState) {
    try {
      typeName = JSON.parse(String(attributes.visState)).type;
    } catch (e) {
      /* missing typename handled below */
    }
  }

  if (!typeName || !visTypes.get(typeName)) {
    attributes.error = 'Unknown visualization type';
    return attributes;
  }

  attributes.type = visTypes.get(typeName);
  attributes.savedObjectType = 'visualization';
  attributes.icon = attributes.type.icon;
  attributes.image = attributes.type.image;
  attributes.typeTitle = attributes.type.title;
  attributes.editUrl = `/edit/${id}`;

  return attributes;
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
  search: string,
  size: number,
  references?: SavedObjectsFindOptionsReference[]
) {
  const visTypes = getTypes();
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
  },
  opts?: any
): Promise<VisSavedObject> {
  if (typeof opts !== 'object') {
    opts = { id: opts };
  }

  const id = (opts.id as string) || '';
  const savedObject = {
    id,
    copyOnSave: false,
    migrationVersion: opts.migrationVersion,
    displayName: SAVED_VIS_TYPE,
    getEsType: () => SAVED_VIS_TYPE,
    getDisplayName: () => SAVED_VIS_TYPE,
    searchSource: opts.searchSource ? services.search.searchSource.createEmpty() : undefined,
  } as VisSavedObject & { _source: any };
  const config = { injectReferences };

  const defaultsProps = getDefaults(opts);
  const tagDecorator = tagDecoratorConfig.factory();
  tagDecorator.decorateObject(savedObject);
  tagDecorator.decorateConfig(config);

  if (!id) {
    _.assign(savedObject, defaultsProps);
    return Promise.resolve(savedObject);
  }

  const {
    saved_object: resp,
    outcome,
    alias_target_id: aliasTargetId,
  } = await services.savedObjectsClient.resolve<SavedObjectAttributes>(SAVED_VIS_TYPE, id);

  if (!resp._version) {
    throw new SavedObjectNotFound(SAVED_VIS_TYPE, id || '');
  }

  savedObject._source = _.cloneDeep(resp.attributes);

  if (savedObject._source.visState) {
    savedObject._source.visState = JSON.parse(savedObject._source.visState);
  }

  // assign the defaults to the response
  _.defaults(savedObject._source, defaultsProps);

  _.assign(savedObject, savedObject._source);
  savedObject.lastSavedTitle = savedObject.title;

  savedObject.sharingSavedObjectProps = {
    aliasTargetId,
    outcome,
    errorJSON:
      outcome === 'conflict' && getSpaces()
        ? JSON.stringify({
            targetType: SAVED_VIS_TYPE,
            sourceId: id,
            targetSpace: (await getSpaces().getActiveSpace()).id,
          })
        : undefined,
  };

  const meta = savedObject._source.kibanaSavedObjectMeta || {};

  if (meta.searchSourceJSON) {
    try {
      let searchSourceValues = parseSearchSourceJSON(meta.searchSourceJSON);

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
    config.injectReferences(savedObject, resp.references);
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
  }: {
    confirmOverwrite?: boolean;
    isTitleDuplicateConfirmed?: boolean;
    onTitleDuplicate?: () => void;
  },
  services: {
    savedObjectsClient: SavedObjectsClientContract;
    chrome: ChromeStart;
    overlays: OverlayStart;
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

  const config = { extractReferences };

  const tagDecorator = tagDecoratorConfig.factory();
  tagDecorator.decorateConfig(config);

  const attributes: any = {
    visState: JSON.stringify(savedObject.visState),
    title: savedObject.title,
    uiStateJSON: savedObject.uiStateJSON,
    description: savedObject.description,
    savedSearchId: savedObject.savedSearchId,
    version: savedObject.version,
    __tags: savedObject.__tags,
  };
  const references: any = [];

  if (savedObject.searchSource) {
    const {
      searchSourceJSON,
      references: searchSourceReferences,
    } = savedObject.searchSource.serialize();
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

  let extractedRefs = config.extractReferences({ attributes, references });

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
    const resp = confirmOverwrite
      ? await saveWithConfirmation(attributes, savedObject, createOpt, services)
      : await services.savedObjectsClient.create(SAVED_VIS_TYPE, extractedRefs.attributes, {
          ...createOpt,
          overwrite: true,
        });

    services.chrome.recentlyAccessed.add(getFullPath(resp.id), savedObject.title, String(resp.id));

    savedObject.id = resp.id;
    savedObject.isSaving = false;
    savedObject.lastSavedTitle = savedObject.title;
    return savedObject.id;
  } catch (err: any) {
    savedObject.isSaving = false;
    savedObject.id = originalId;
    if (isErrorNonFatal(err)) {
      return '';
    }
    return Promise.reject(err);
  }
}
