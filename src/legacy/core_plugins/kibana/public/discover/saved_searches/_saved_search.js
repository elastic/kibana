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

import 'ui/notify';
import { uiModules } from 'ui/modules';
import { createLegacyClass } from 'ui/utils/legacy_class';
import { SavedObjectProvider } from 'ui/saved_objects/saved_object';

const module = uiModules.get('discover/saved_searches', ['kibana/courier']);

module.factory('SavedSearch', function(Private) {
  const SavedObject = Private(SavedObjectProvider);
  createLegacyClass(SavedSearch).inherits(SavedObject);
  function SavedSearch(id) {
    SavedObject.call(this, {
      type: SavedSearch.type,
      mapping: SavedSearch.mapping,
      searchSource: SavedSearch.searchSource,

      id: id,
      defaults: {
        title: '',
        description: '',
        columns: [],
        hits: 0,
        sort: [],
        version: 1,
      },
    });

    this.showInRecentlyAccessed = true;
  }

  SavedSearch.type = 'search';

  SavedSearch.mapping = {
    title: 'text',
    description: 'text',
    hits: 'integer',
    columns: 'keyword',
    sort: 'keyword',
    version: 'integer',
  };

  // Order these fields to the top, the rest are alphabetical
  SavedSearch.fieldOrder = ['title', 'description'];

  SavedSearch.searchSource = true;

  SavedSearch.prototype.getFullPath = function() {
    return `/app/kibana#/discover/${this.id}`;
  };

  return SavedSearch;
});
