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

import { createSavedObjectClass } from 'ui/saved_objects/saved_object';

// Used only by the savedSheets service, usually no reason to change this
export function createSavedSheetClass(services) {
  const SavedObjectClass = createSavedObjectClass(services);

  class SavedSheet extends SavedObjectClass {
    static type = 'timelion-sheet';

    // if type:sheet has no mapping, we push this mapping into ES
    static mapping = {
      title: 'text',
      hits: 'integer',
      description: 'text',
      timelion_sheet: 'text',
      timelion_interval: 'keyword',
      timelion_other_interval: 'keyword',
      timelion_chart_height: 'integer',
      timelion_columns: 'integer',
      timelion_rows: 'integer',
      version: 'integer',
    };

    // Order these fields to the top, the rest are alphabetical
    static fieldOrder = ['title', 'description'];
    // SavedSheet constructor. Usually you'd interact with an instance of this.
    // ID is option, without it one will be generated on save.
    constructor(id) {
      super({
        type: SavedSheet.type,
        mapping: SavedSheet.mapping,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id: id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: 'New TimeLion Sheet',
          hits: 0,
          description: '',
          timelion_sheet: ['.es(*)'],
          timelion_interval: 'auto',
          timelion_chart_height: 275,
          timelion_columns: services.config.get('timelion:default_columns') || 2,
          timelion_rows: services.config.get('timelion:default_rows') || 2,
          version: 1,
        },
      });
      this.showInRecentlyAccessed = true;
    }
    getFullPath() {
      return `/app/timelion#/${this.id}`;
    }
  }

  return SavedSheet;
}
