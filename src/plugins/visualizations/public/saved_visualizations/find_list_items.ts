/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import {
  SavedObjectAttributes,
  SavedObjectsClientContract,
  SavedObjectsFindOptionsReference,
  SavedObjectsFindOptions,
} from '../../../../core/public';
import { SavedObjectLoader } from '../../../../plugins/saved_objects/public';
import type { VisTypeAlias } from '../vis_types';
import { VisualizationsAppExtension } from '../vis_types/vis_type_alias_registry';

/**
 * Search for visualizations and convert them into a list display-friendly format.
 */
export async function findListItems({
  visTypes,
  search,
  size,
  savedObjectsClient,
  mapSavedObjectApiHits,
  references,
}: {
  search: string;
  size: number;
  visTypes: VisTypeAlias[];
  savedObjectsClient: SavedObjectsClientContract;
  mapSavedObjectApiHits: SavedObjectLoader['mapSavedObjectApiHits'];
  references?: SavedObjectsFindOptionsReference[];
}) {
  const extensions = visTypes
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
        return mapSavedObjectApiHits(savedObject);
      }
    }),
  };
}
