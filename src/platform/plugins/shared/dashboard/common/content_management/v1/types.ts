/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { RefreshInterval } from '@kbn/data-plugin/common';
import { ControlGroupChainingSystem, ControlLabelPosition } from '@kbn/controls-plugin/common';

import { DashboardContentType } from '../types';

export type DashboardCrudTypes = ContentManagementCrudTypes<
  DashboardContentType,
  DashboardAttributes,
  Pick<SavedObjectCreateOptions, 'id' | 'references' | 'overwrite'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;

export type DashboardItem = DashboardCrudTypes['Item'];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ControlGroupAttributesV1 = {
  chainingSystem?: ControlGroupChainingSystem;
  panelsJSON: string; // stringified version of ControlSerializedState
  ignoreParentSettingsJSON: string;
  controlStyle?: ControlLabelPosition;
};

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export type DashboardAttributes = {
  controlGroupInput?: ControlGroupAttributesV1;
  refreshInterval?: RefreshInterval;
  timeRestore: boolean;
  optionsJSON?: string;
  useMargins?: boolean;
  description: string;
  panelsJSON: string;
  timeFrom?: string;
  version?: number;
  timeTo?: string;
  title: string;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
};
