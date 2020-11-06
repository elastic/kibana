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

import { omit } from 'lodash';
import {
  convertSavedDashboardPanelToPanelState,
  convertPanelStateToSavedDashboardPanel,
} from './embeddable_saved_object_converters';
import { SavedDashboardPanel } from '../types';
import { SavedObjectReference } from '../../../../core/types';
import { EmbeddablePersistableStateService } from '../../../embeddable/common/types';

export interface InjectDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

export function injectPanelsReferences(
  panels: SavedDashboardPanel[],
  references: SavedObjectReference[],
  deps: InjectDeps
): SavedDashboardPanel[] {
  const result: SavedDashboardPanel[] = [];
  for (const panel of panels) {
    const embeddableState = convertSavedDashboardPanelToPanelState(panel);
    embeddableState.explicitInput = omit(
      deps.embeddablePersistableStateService.inject(
        { ...embeddableState.explicitInput, type: panel.type },
        references
      ),
      'type'
    );
    result.push(convertPanelStateToSavedDashboardPanel(embeddableState, panel.version));
  }
  return result;
}

export interface ExtractDeps {
  embeddablePersistableStateService: EmbeddablePersistableStateService;
}

export function extractPanelsReferences(
  panels: SavedDashboardPanel[],
  deps: ExtractDeps
): Array<{ panel: SavedDashboardPanel; references: SavedObjectReference[] }> {
  const result: Array<{ panel: SavedDashboardPanel; references: SavedObjectReference[] }> = [];

  for (const panel of panels) {
    const embeddable = convertSavedDashboardPanelToPanelState(panel);
    const {
      state: embeddableInputWithExtractedReferences,
      references,
    } = deps.embeddablePersistableStateService.extract({
      ...embeddable.explicitInput,
      type: embeddable.type,
    });
    embeddable.explicitInput = omit(embeddableInputWithExtractedReferences, 'type');

    const newPanel = convertPanelStateToSavedDashboardPanel(embeddable, panel.version);
    result.push({
      panel: newPanel,
      references,
    });
  }

  return result;
}
