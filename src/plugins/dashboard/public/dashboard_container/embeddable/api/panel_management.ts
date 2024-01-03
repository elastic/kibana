/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
  PanelState,
} from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../../common';
import { DashboardContainer } from '../dashboard_container';

export async function addOrUpdateEmbeddable<
  EEI extends EmbeddableInput = EmbeddableInput,
  EEO extends EmbeddableOutput = EmbeddableOutput,
  E extends IEmbeddable<EEI, EEO> = IEmbeddable<EEI, EEO>
>(this: DashboardContainer, type: string, explicitInput: Partial<EEI>, embeddableId?: string) {
  const idToReplace = embeddableId || explicitInput.id;
  if (idToReplace && this.input.panels[idToReplace]) {
    return this.replacePanel(this.input.panels[idToReplace], {
      type,
      explicitInput: {
        ...explicitInput,
        id: idToReplace,
      },
    });
  }
  return this.addNewEmbeddable<EEI, EEO, E>(type, explicitInput);
}

export async function replacePanel(
  this: DashboardContainer,
  previousPanelState: DashboardPanelState<EmbeddableInput>,
  newPanelState: Partial<PanelState>,
  generateNewId?: boolean
): Promise<string> {
  const panelId = await this.replaceEmbeddable(
    previousPanelState.explicitInput.id,
    {
      ...newPanelState.explicitInput,
      id: previousPanelState.explicitInput.id,
    },
    newPanelState.type,
    generateNewId
  );
  return panelId;
}
