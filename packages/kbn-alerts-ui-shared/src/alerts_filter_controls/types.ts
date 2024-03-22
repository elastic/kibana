/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ControlGroupInput, OptionsListEmbeddableInput } from '@kbn/controls-plugin/common';
import type {
  AddOptionsListControlProps,
  ControlGroupContainer,
} from '@kbn/controls-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';

export type FilterUrlFormat = Record<
  string,
  Pick<
    OptionsListEmbeddableInput,
    'selectedOptions' | 'title' | 'fieldName' | 'existsSelected' | 'exclude'
  >
>;

export interface FilterContextType {
  allControls: FilterItemObj[] | undefined;
  addControl: (controls: FilterItemObj) => void;
}

export type FilterItemObj = Omit<AddOptionsListControlProps, 'controlId' | 'dataViewId'> & {
  /*
   * Determines the present and order of a control
   *
   * */
  persist?: boolean;
};

export type FilterGroupHandler = ControlGroupContainer;

export type FilterGroupProps = {
  featureIds: AlertConsumers[];
  dataViewId: string | null;
  onFilterChange?: (newFilters: Filter[]) => void;
  defaultControls: FilterItemObj[];
  controlsUrlState?: FilterItemObj[];
  spaceId?: string;
  onInit?: (controlGroupHandler: FilterGroupHandler | undefined) => void;
  maxControls?: number;
  ControlGroupRenderer: typeof ControlGroupRenderer;
  Storage: typeof Storage;
} & Pick<ControlGroupInput, 'timeRange' | 'filters' | 'query' | 'chainingSystem'>;
