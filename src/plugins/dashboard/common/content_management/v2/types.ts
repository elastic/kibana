/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { RawControlGroupAttributes } from '@kbn/controls-plugin/common';
import { DashboardContentType } from '../types';
import { DashboardAttributes as DashboardAttributesV1 } from '../v1/types';

type ControlGroupAttributesV2 = Pick<
  RawControlGroupAttributes,
  | 'panelsJSON'
  | 'chainingSystem'
  | 'controlStyle'
  | 'ignoreParentSettingsJSON'
  | 'showApplySelections'
>;

export type DashboardAttributes = Omit<DashboardAttributesV1, 'controlGroupInput'> & {
  controlGroupInput?: ControlGroupAttributesV2;
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
