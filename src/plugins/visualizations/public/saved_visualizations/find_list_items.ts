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

import _ from 'lodash';
import { SavedObjectAttributes, SavedObjectsClientContract } from '../../../../core/public';
import { SavedObjectLoader } from '../../../../plugins/saved_objects/public';
import { VisTypeAlias } from '../vis_types';
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
}: {
  search: string;
  size: number;
  visTypes: VisTypeAlias[];
  savedObjectsClient: SavedObjectsClientContract;
  mapSavedObjectApiHits: SavedObjectLoader['mapSavedObjectApiHits'];
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
  const searchOptions = {
    type: searchOption('docTypes', 'visualization'),
    searchFields: searchOption('searchFields', 'title^3', 'description'),
    search: search ? `${search}*` : undefined,
    perPage: size,
    page: 1,
    defaultSearchOperator: 'AND' as 'AND',
  };

  const { total, savedObjects } = await savedObjectsClient.find<SavedObjectAttributes>(
    searchOptions
  );

  return {
    total,
    hits: savedObjects.map((savedObject) => {
      const config = extensionByType[savedObject.type];

      if (config) {
        return config.toListItem(savedObject);
      } else {
        return mapSavedObjectApiHits(savedObject);
      }
    }),
  };
}
