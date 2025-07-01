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
import { DashboardContentType } from '../types';
import {
  ControlGroupAttributesV1,
  DashboardAttributes as DashboardAttributesV1,
  GridData as GridDataV1,
  SavedDashboardPanel as SavedDashboardPanelV1,
} from '../v1/types';

export type GridData = GridDataV1 & {
  sectionId?: string;
};

export type SavedDashboardPanel = Omit<SavedDashboardPanelV1, 'gridData'> & {
  gridData: GridData;
};

export type ControlGroupAttributes = ControlGroupAttributesV1 & {
  showApplySelections?: boolean;
};

interface DashboardSectionState {
  title: string;
  collapsed?: boolean; // if undefined, then collapsed is false
  readonly gridData: Pick<GridData, 'i' | 'y'>;
  id: string;
}

export type DashboardAttributes = Omit<DashboardAttributesV1, 'controlGroupInput'> & {
  controlGroupInput?: ControlGroupAttributes;
  sections?: DashboardSectionState[];
};

export type DashboardCrudTypes = ContentManagementCrudTypes<
  DashboardContentType,
  DashboardAttributes,
  Pick<SavedObjectCreateOptions, 'id' | 'references' | 'overwrite'>,
  Pick<SavedObjectUpdateOptions, 'references' | 'mergeAttributes'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;
