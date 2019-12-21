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
import { npStart } from 'ui/new_platform';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/saved_objects';

import { start as visualizations } from '../../../../visualizations/public/np_ready/public/legacy';
// @ts-ignore
import { findListItems } from './find_list_items';
import { createSavedVisClass } from './_saved_vis';
import { createVisualizeEditUrl } from '..';
const app = uiModules.get('app/visualize');

app.service('savedVisualizations', function() {
  const savedObjectsClient = npStart.core.savedObjects.client;
  const services = {
    savedObjectsClient,
    indexPatterns: npStart.plugins.data.indexPatterns,
    chrome: npStart.core.chrome,
    overlays: npStart.core.overlays,
  };
  class SavedObjectLoaderVisualize extends SavedObjectLoader {
    mapHitSource = (source: Record<string, any>, id: string) => {
      const visTypes = visualizations.types;
      source.id = id;
      source.url = this.urlFor(id);

      let typeName = source.typeName;
      if (source.visState) {
        try {
          typeName = JSON.parse(String(source.visState)).type;
        } catch (e) {
          /* missing typename handled below */
        } // eslint-disable-line no-empty
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
      source.editUrl = `#${createVisualizeEditUrl(id)}`;

      return source;
    };
    urlFor(id: string) {
      return `#/visualize/edit/${encodeURIComponent(id)}`;
    }
    // This behaves similarly to find, except it returns visualizations that are
    // defined as appExtensions and which may not conform to type: visualization
    findListItems(search: string = '', size: number = 100) {
      return findListItems({
        search,
        size,
        mapSavedObjectApiHits: this.mapSavedObjectApiHits.bind(this),
        savedObjectsClient,
        visTypes: visualizations.types.getAliases(),
      });
    }
  }
  const SavedVis = createSavedVisClass(services);

  return new SavedObjectLoaderVisualize(SavedVis, savedObjectsClient, npStart.core.chrome);
});
