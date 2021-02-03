/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/public';
import { SavedObjectsStart } from '../../../saved_objects/public';

// Used only by the savedSheets service, usually no reason to change this
export function createSavedSheetClass(savedObjects: SavedObjectsStart, config: IUiSettingsClient) {
  class SavedSheet extends savedObjects.SavedObjectClass {
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
    constructor(id: string) {
      super({
        type: SavedSheet.type,
        mapping: SavedSheet.mapping,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: 'New TimeLion Sheet',
          hits: 0,
          description: '',
          timelion_sheet: ['.es(*)'],
          timelion_interval: 'auto',
          timelion_chart_height: 275,
          timelion_columns: config.get('timelion:default_columns') || 2,
          timelion_rows: config.get('timelion:default_rows') || 2,
          version: 1,
        },
      });
      this.showInRecentlyAccessed = true;
      this.getFullPath = () => `/app/timelion#/${this.id}`;
    }
  }

  return SavedSheet as unknown;
}
