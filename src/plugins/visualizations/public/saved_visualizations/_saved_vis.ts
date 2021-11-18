/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @name SavedVis
 *
 * @extends SavedObject.
 *
 * NOTE: It's a type of SavedObject, but specific to visualizations.
 */
import type { SavedObjectsStart, SavedObject } from '../../../../plugins/saved_objects/public';
// @ts-ignore
import { updateOldState } from '../legacy/vis_update_state';
import { __LEGACY } from '../../../discover/public';
import { extractReferences, injectReferences } from '../utils/saved_visualization_references';
import type { SavedObjectsClientContract } from '../../../../core/public';
import type { IndexPatternsContract } from '../../../../plugins/data/public';
import type { ISavedVis } from '../types';

export interface SavedVisServices {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjects: SavedObjectsStart;
  indexPatterns: IndexPatternsContract;
}

/** @deprecated **/
export function createSavedVisClass(services: SavedVisServices) {
  const savedSearch = __LEGACY.createSavedSearchesLoader(services);

  class SavedVis extends services.savedObjects.SavedObjectClass {
    public static type: string = 'visualization';
    public static mapping: Record<string, string> = {
      title: 'text',
      visState: 'json',
      uiStateJSON: 'text',
      description: 'text',
      savedSearchId: 'keyword',
      version: 'integer',
    };
    // Order these fields to the top, the rest are alphabetical
    public static fieldOrder = ['title', 'description'];

    constructor(opts: Record<string, unknown> | string = {}) {
      if (typeof opts !== 'object') {
        opts = { id: opts };
      }
      const visState = !opts.type ? null : { type: opts.type };
      // Gives our SavedWorkspace the properties of a SavedObject
      super({
        type: SavedVis.type,
        mapping: SavedVis.mapping,
        extractReferences,
        injectReferences,
        id: (opts.id as string) || '',
        indexPattern: opts.indexPattern,
        defaults: {
          title: '',
          visState,
          uiStateJSON: '{}',
          description: '',
          savedSearchId: opts.savedSearchId,
          version: 1,
        },
        afterESResp: async (savedObject: SavedObject) => {
          const savedVis = savedObject as any as ISavedVis;
          savedVis.visState = await updateOldState(savedVis.visState);
          if (savedVis.searchSourceFields?.index) {
            await services.indexPatterns.get(savedVis.searchSourceFields.index as any);
          }
          if (savedVis.savedSearchId) {
            await savedSearch.get(savedVis.savedSearchId);
          }
          return savedVis as any as SavedObject;
        },
      });
      this.showInRecentlyAccessed = true;
      this.getFullPath = () => {
        return `/app/visualize#/edit/${this.id}`;
      };
    }
  }

  return SavedVis as unknown as new (opts: Record<string, unknown> | string) => SavedObject;
}
