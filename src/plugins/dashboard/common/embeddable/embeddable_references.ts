/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { SavedObjectReference } from '@kbn/core/types';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common/types';
import {
  convertSavedDashboardPanelToPanelState,
  convertPanelStateToSavedDashboardPanel,
} from './embeddable_saved_object_converters';
import { SavedDashboardPanel } from '../types';

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
    const { state: embeddableInputWithExtractedReferences, references } =
      deps.embeddablePersistableStateService.extract({
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
