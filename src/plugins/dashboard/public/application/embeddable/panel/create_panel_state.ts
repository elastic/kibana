/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PanelState, EmbeddableInput } from '../../../embeddable_plugin';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../dashboard_constants';
import { DashboardPanelState } from '../types';
import {
  IPanelPlacementArgs,
  findTopLeftMostOpenSpace,
  PanelPlacementMethod,
} from './dashboard_panel_placement';

/**
 * Creates and initializes a basic panel state.
 */
export function createPanelState<
  TEmbeddableInput extends EmbeddableInput,
  TPlacementMethodArgs extends IPanelPlacementArgs = IPanelPlacementArgs
>(
  panelState: PanelState<TEmbeddableInput>,
  currentPanels: { [key: string]: DashboardPanelState },
  placementMethod?: PanelPlacementMethod<TPlacementMethodArgs>,
  placementArgs?: TPlacementMethodArgs
): DashboardPanelState<TEmbeddableInput> {
  const defaultPlacementArgs = {
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    currentPanels,
  };
  const finalPlacementArgs = placementArgs
    ? {
        ...defaultPlacementArgs,
        ...placementArgs,
      }
    : defaultPlacementArgs;

  const gridDataLocation = placementMethod
    ? placementMethod(finalPlacementArgs as TPlacementMethodArgs)
    : findTopLeftMostOpenSpace(defaultPlacementArgs);

  return {
    gridData: {
      ...gridDataLocation,
      i: panelState.explicitInput.id,
    },
    ...panelState,
  };
}
