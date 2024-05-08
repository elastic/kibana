/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupApi } from '@kbn/controls-plugin/public/control_group/types';
import { DefaultControlApi } from '@kbn/controls-plugin/public/types';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { StateComparators } from '@kbn/presentation-publishing';

export type ControlApiRegistration = Omit<
  DefaultControlApi,
  'uuid' | 'parent' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges' | 'grow$' | 'width$'
>;

export interface ControlFactory<
  State extends object = object,
  InternalApi extends unknown = unknown
> {
  type: string;
  getIconType: () => string;
  getDisplayName: () => string;
  // getSupportedFieldTypes: () => string[];
  isFieldCompatible: (field: DataViewField) => boolean;
  CustomOptionsComponent: React.FC<{ internalApi?: InternalApi }>; // internal api manages state
  buildControl: (
    initialState: State,
    buildApi: (
      apiRegistration: ControlApiRegistration,
      comparators: StateComparators<State>
    ) => DefaultControlApi,
    uuid: string,
    parentApi?: ControlGroupApi
  ) => { api: DefaultControlApi; Component: React.FC<{}> };
}
