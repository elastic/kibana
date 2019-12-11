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
import angular from 'angular';
import { npStart } from 'ui/new_platform';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { SavedObject } from 'ui/saved_objects/types';
import { createSavedObjectClass } from 'ui/saved_objects/saved_object';
import { extractReferences, injectReferences } from './saved_dashboard_references';
import { createDashboardEditUrl } from '../dashboard_constants';

import { esFilters, Query, RefreshInterval } from '../../../../../../plugins/data/public';

export interface SavedObjectDashboard extends SavedObject {
  id?: string;
  timeRestore: boolean;
  timeTo?: string;
  timeFrom?: string;
  description?: string;
  panelsJSON: string;
  optionsJSON?: string;
  // TODO: write a migration to rid of this, it's only around for bwc.
  uiStateJSON?: string;
  lastSavedTitle: string;
  refreshInterval?: RefreshInterval;
  getQuery(): Query;
  getFilters(): esFilters.Filter[];
}

const module = uiModules.get('app/dashboard');

// Used only by the savedDashboards service, usually no reason to change this
module.factory('SavedDashboard', function() {
  const services = {
    savedObjectsClient: npStart.core.savedObjects.client,
    indexPatterns: npStart.plugins.data.indexPatterns,
    chrome: npStart.core.chrome,
    overlays: npStart.core.overlays,
  };
  const SavedObjectClass = createSavedObjectClass(services);
  class SavedDashboard extends SavedObjectClass {
    // save these objects with the 'dashboard' type
    public static type = 'dashboard';

    // if type:dashboard has no mapping, we push this mapping into ES
    public static mapping = {
      title: 'text',
      hits: 'integer',
      description: 'text',
      panelsJSON: 'text',
      optionsJSON: 'text',
      version: 'integer',
      timeRestore: 'boolean',
      timeTo: 'keyword',
      timeFrom: 'keyword',
      refreshInterval: {
        type: 'object',
        properties: {
          display: { type: 'keyword' },
          pause: { type: 'boolean' },
          section: { type: 'integer' },
          value: { type: 'integer' },
        },
      },
    };

    // Order these fields to the top, the rest are alphabetical
    public static fieldOrder = ['title', 'description'];

    public static searchSource = true;
    public showInRecentlyAccessed = true;

    constructor(id: string) {
      super({
        type: SavedDashboard.type,
        mapping: SavedDashboard.mapping,
        searchSource: SavedDashboard.searchSource,
        extractReferences,
        injectReferences,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: '',
          hits: 0,
          description: '',
          panelsJSON: '[]',
          optionsJSON: angular.toJson({
            // for BWC reasons we can't default dashboards that already exist without this setting to true.
            useMargins: !id,
            hidePanelTitles: false,
          }),
          version: 1,
          timeRestore: false,
          timeTo: undefined,
          timeFrom: undefined,
          refreshInterval: undefined,
        },
      });
    }
    getFullPath() {
      return `/app/kibana#${createDashboardEditUrl(this.id)}`;
    }

    getQuery() {
      return this.searchSource!.getOwnField('query') || { query: '', language: 'kuery' };
    }

    getFilters() {
      return this.searchSource!.getOwnField('filter') || [];
    }
  }

  return SavedDashboard;
});
