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
  allControls: FilterControlConfig[] | undefined;
  addControl: (controls: FilterControlConfig) => void;
}

export type FilterControlConfig = Omit<AddOptionsListControlProps, 'controlId' | 'dataViewId'> & {
  /*
   * Determines the presence and order of a control
   * */
  persist?: boolean;
};

export type FilterGroupHandler = ControlGroupContainer;

export interface FilterGroupProps
  extends Pick<ControlGroupInput, 'timeRange' | 'filters' | 'query' | 'chainingSystem'> {
  spaceId?: string;
  dataViewId: string | null;
  featureIds: AlertConsumers[];
  /**
   * Filters changed callback
   */
  onFiltersChange?: (newFilters: Filter[]) => void;
  defaultControls: FilterControlConfig[];
  /**
   * The controls configuration stored in the URL
   * (takes precedence over the localStorage configuration)
   */
  controlsUrlState?: FilterControlConfig[];
  /**
   * Setter for the controls url state
   */
  setControlsUrlState?: (controls: FilterControlConfig[]) => void;
  /**
   * Init callback
   */
  onInit?: (controlGroupHandler: FilterGroupHandler | undefined) => void;
  /**
   * Maximum number of controls that can be added to the group
   */
  maxControls?: number;
  /**
   * The control embeddable renderer
   */
  ControlGroupRenderer: typeof ControlGroupRenderer;
  Storage: typeof Storage;
}
