/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableStart } from '../services/embeddable';
import { SavedObject, SavedObjectsStart } from '../services/saved_objects';
import { Filter, ISearchSource, Query, RefreshInterval } from '../services/data';

import { createDashboardEditUrl } from '../dashboard_constants';
import { extractReferences, injectReferences } from '../../common/saved_dashboard_references';

import { SavedObjectAttributes, SavedObjectReference } from '../../../../core/types';
import { DashboardOptions } from '../types';

export interface DashboardSavedObject extends SavedObject {
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
  searchSource: ISearchSource;
  getQuery(): Query;
  getFilters(): Filter[];
  getFullEditPath: (editMode?: boolean) => string;
}

// Used only by the savedDashboards service, usually no reason to change this
export function createSavedDashboardClass(
  savedObjectStart: SavedObjectsStart,
  embeddableStart: EmbeddableStart
): new (id: string) => DashboardSavedObject {
  class SavedDashboard extends savedObjectStart.SavedObjectClass {
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
    public static fieldOrder = ['title', 'description'];
    public static searchSource = true;
    public showInRecentlyAccessed = true;

    constructor(id: string) {
      super({
        type: SavedDashboard.type,
        mapping: SavedDashboard.mapping,
        searchSource: SavedDashboard.searchSource,
        extractReferences: (opts: {
          attributes: SavedObjectAttributes;
          references: SavedObjectReference[];
        }) => extractReferences(opts, { embeddablePersistableStateService: embeddableStart }),
        injectReferences: (so: DashboardSavedObject, references: SavedObjectReference[]) => {
          const newAttributes = injectReferences(
            { attributes: so._serialize().attributes, references },
            {
              embeddablePersistableStateService: embeddableStart,
            }
          );
          Object.assign(so, newAttributes);
        },

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: '',
          hits: 0,
          description: '',
          panelsJSON: '[]',
          optionsJSON: JSON.stringify({
            // for BWC reasons we can't default dashboards that already exist without this setting to true.
            useMargins: true,
            syncColors: false,
            hidePanelTitles: false,
          } as DashboardOptions),
          version: 1,
          timeRestore: false,
          timeTo: undefined,
          timeFrom: undefined,
          refreshInterval: undefined,
        },
      });
      this.getFullPath = () => `/app/dashboards#${createDashboardEditUrl(this.id)}`;
    }

    getQuery() {
      return this.searchSource!.getOwnField('query') || { query: '', language: 'kuery' };
    }

    getFilters() {
      return this.searchSource!.getOwnField('filter') || [];
    }

    getFullEditPath = (editMode?: boolean) => {
      return `/app/dashboards#${createDashboardEditUrl(this.id, editMode)}`;
    };
  }

  // Unfortunately this throws a typescript error without the casting.  I think it's due to the
  // convoluted way SavedObjects are created.
  return SavedDashboard as unknown as new (id: string) => DashboardSavedObject;
}
