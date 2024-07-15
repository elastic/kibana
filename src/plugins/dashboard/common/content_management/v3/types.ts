/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CMCrudTypes,
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { DashboardOptions } from '../../types';
import { DashboardContentType } from '../types';
import {
  DashboardAttributes as DashboardAttributesV2,
  SavedDashboardPanel as SavedDashboardPanelV2,
} from '../v2';

export type { PersistableControlGroupInput as ControlGroupAttributes };

export type { DashboardAttributesV2 as RawDashboardAttributes };

export type DashboardAttributes = Omit<
  DashboardAttributesV2,
  'panelsJSON' | 'optionsJSON' | 'kibanaSavedObjectMeta' | 'controlGroupInput'
> & {
  controlGroupInput?: PersistableControlGroupInput;
  panels: SavedDashboardPanelV2[];
  options: DashboardOptions;
  kibanaSavedObjectMeta: {
    searchSource: SerializedSearchSourceFields & { indexRefName: string };
  };
};

export type DashboardCrudTypes = CMCrudTypes &
  ContentManagementCrudTypes<
    DashboardContentType,
    DashboardAttributes,
    Pick<SavedObjectCreateOptions, 'id' | 'references' | 'overwrite'>,
    Pick<SavedObjectUpdateOptions, 'references' | 'mergeAttributes'>,
    {
      /** Flag to indicate to only search the text on the "title" field */
      onlyTitle?: boolean;
    }
  >;
