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

import './_saved_vis';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader, SavedObjectsClientProvider } from 'ui/saved_objects';
import { savedObjectManagementRegistry } from '../../management/saved_object_registry';
import { start as visualizations } from '../../../../visualizations/public/np_ready/public/legacy';
import { createVisualizeEditUrl } from '../index';
import { findListItems } from './find_list_items';
import { npStart } from '../../../../../ui/public/new_platform';

const app = uiModules.get('app/visualize');

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedVisualizations',
  title: 'visualizations',
});

app.service('savedVisualizations', function(SavedVis, Private) {
  const visTypes = visualizations.types;
  const savedObjectClient = Private(SavedObjectsClientProvider);
  const saveVisualizationLoader = new SavedObjectLoader(
    SavedVis,
    savedObjectClient,
    npStart.core.chrome
  );

  saveVisualizationLoader.mapHitSource = function(source, id) {
    source.id = id;
    source.url = this.urlFor(id);

    let typeName = source.typeName;
    if (source.visState) {
      try {
        typeName = JSON.parse(source.visState).type;
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

  saveVisualizationLoader.urlFor = function(id) {
    return `#/visualize/edit/${encodeURIComponent(id)}`;
  };

  // This behaves similarly to find, except it returns visualizations that are
  // defined as appExtensions and which may not conform to type: visualization
  saveVisualizationLoader.findListItems = function(search = '', size = 100) {
    return findListItems({
      search,
      size,
      mapSavedObjectApiHits: this.mapSavedObjectApiHits.bind(this),
      savedObjectsClient: this.savedObjectsClient,
      visTypes: visualizations.types.getAliases(),
    });
  };

  return saveVisualizationLoader;
});
