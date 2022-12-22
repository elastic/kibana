/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RefreshInterval } from '@kbn/data-plugin/common';
import { RawControlGroupAttributes } from '@kbn/controls-plugin/common';

import { Serializable } from '@kbn/utility-types';
import { DashboardOptions, GridData } from '../types';

/**
 * The attributes of the dashboard saved object. This interface should be the
 * source of truth for the latest dashboard attributes shape after all migrations.
 */
export interface DashboardAttributes {
  controlGroupInput?: RawControlGroupAttributes;
  refreshInterval?: RefreshInterval;
  timeRestore: boolean;
  optionsJSON?: string;
  useMargins?: boolean;
  description: string;
  panelsJSON: string;
  timeFrom?: string;
  version: number;
  timeTo?: string;
  title: string;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
}

export type ParsedDashboardAttributes = Omit<DashboardAttributes, 'panelsJSON' | 'optionsJSON'> & {
  panels: SavedDashboardPanel[];
  options: DashboardOptions;
};

/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
export interface SavedDashboardPanel {
  embeddableConfig: { [key: string]: Serializable }; // parsed into the panel's explicitInput
  id?: string; // the saved object id for by reference panels
  type: string; // the embeddable type
  panelRefName?: string;
  gridData: GridData;
  panelIndex: string;
  version: string;
  title?: string;
}
