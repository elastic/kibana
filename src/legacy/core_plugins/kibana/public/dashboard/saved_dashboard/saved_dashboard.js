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
import { uiModules } from 'ui/modules';
import { createDashboardEditUrl } from '../np_ready/dashboard_constants';
import { createLegacyClass } from 'ui/utils/legacy_class';
import { SavedObjectProvider } from 'ui/saved_objects/saved_object';
import { extractReferences, injectReferences } from './saved_dashboard_references';

const module = uiModules.get('app/dashboard');

// Used only by the savedDashboards service, usually no reason to change this
module.factory('SavedDashboard', function(Private) {
  // SavedDashboard constructor. Usually you'd interact with an instance of this.
  // ID is option, without it one will be generated on save.
  const SavedObject = Private(SavedObjectProvider);
  createLegacyClass(SavedDashboard).inherits(SavedObject);
  function SavedDashboard(id) {
    // Gives our SavedDashboard the properties of a SavedObject
    SavedDashboard.Super.call(this, {
      type: SavedDashboard.type,
      mapping: SavedDashboard.mapping,
      searchSource: SavedDashboard.searchsource,
      extractReferences: extractReferences,
      injectReferences: injectReferences,

      // if this is null/undefined then the SavedObject will be assigned the defaults
      id: id,

      // default values that will get assigned if the doc is new
      defaults: {
        title: '',
        hits: 0,
        description: '',
        panelsJSON: '[]',
        optionsJSON: angular.toJson({
          // for BWC reasons we can't default dashboards that already exist without this setting to true.
          useMargins: id ? false : true,
          hidePanelTitles: false,
        }),
        version: 1,
        timeRestore: false,
        timeTo: undefined,
        timeFrom: undefined,
        refreshInterval: undefined,
      },

      // if an indexPattern was saved with the searchsource of a SavedDashboard
      // object, clear it. It was a mistake
      clearSavedIndexPattern: true,
    });

    this.showInRecentlyAccessed = true;
  }

  // save these objects with the 'dashboard' type
  SavedDashboard.type = 'dashboard';

  // if type:dashboard has no mapping, we push this mapping into ES
  SavedDashboard.mapping = {
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
  SavedDashboard.fieldOrder = ['title', 'description'];

  SavedDashboard.searchsource = true;

  SavedDashboard.prototype.getFullPath = function() {
    return `/app/kibana#${createDashboardEditUrl(this.id)}`;
  };

  SavedDashboard.prototype.getQuery = function() {
    return this.searchSource.getOwnField('query') || { query: '', language: 'kuery' };
  };

  SavedDashboard.prototype.getFilters = function() {
    return this.searchSource.getOwnField('filter') || [];
  };

  return SavedDashboard;
});
