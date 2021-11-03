/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject, SavedObjectsStart } from '../../../../saved_objects/public';
import { SAVED_SEARCH_TYPE } from '../constants';
import { getSavedSearchFullPathUrl } from '../saved_searches_utils';

/** @deprecated **/
export function createSavedSearchClass(savedObjects: SavedObjectsStart) {
  class SavedSearch extends savedObjects.SavedObjectClass {
    public static type: string = SAVED_SEARCH_TYPE;
    public static mapping = {
      title: 'text',
      description: 'text',
      hideChart: 'boolean',
      hits: 'integer',
      columns: 'keyword',
      grid: 'object',
      sort: 'keyword',
      version: 'integer',
    };
    // Order these fields to the top, the rest are alphabetical
    public static fieldOrder = ['title', 'description'];
    public static searchSource = true;

    public id: string;
    public showInRecentlyAccessed: boolean;

    constructor(id: string) {
      super({
        id,
        type: SAVED_SEARCH_TYPE,
        mapping: {
          title: 'text',
          description: 'text',
          hideChart: 'boolean',
          hits: 'integer',
          columns: 'keyword',
          grid: 'object',
          sort: 'keyword',
          version: 'integer',
        },
        searchSource: true,
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
      this.id = id;
      this.getFullPath = () => getSavedSearchFullPathUrl(String(id));
    }
  }

  return SavedSearch as unknown as new (id: string) => SavedObject;
}
