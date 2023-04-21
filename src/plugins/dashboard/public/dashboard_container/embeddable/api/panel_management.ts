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
import { v4 as uuidv4 } from 'uuid';

import {
  IPanelPlacementArgs,
  PanelPlacementMethod,
} from '../../component/panel/dashboard_panel_placement';
import { DashboardPanelState } from '../../../../common';
import { createPanelState } from '../../component/panel';
import { DashboardContainer } from '../dashboard_container';
import { PLACEHOLDER_EMBEDDABLE } from '../../../placeholder_embeddable';

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
  let panels;
  let panelId;

  if (generateNewId) {
    // replace panel can be called with generateNewId in order to totally destroy and recreate the embeddable
    panelId = uuidv4();
    panels = { ...this.input.panels };
    delete panels[previousPanelState.explicitInput.id];
    panels[panelId] = {
      ...previousPanelState,
      ...newPanelState,
      gridData: {
        ...previousPanelState.gridData,
        i: panelId,
      },
      explicitInput: {
        ...newPanelState.explicitInput,
        id: panelId,
      },
    };
  } else {
    // Because the embeddable type can change, we have to operate at the container level here
    panelId = previousPanelState.explicitInput.id;
    panels = {
      ...this.input.panels,
      [panelId]: {
        ...previousPanelState,
        ...newPanelState,
        gridData: {
          ...previousPanelState.gridData,
        },
        explicitInput: {
          ...newPanelState.explicitInput,
          id: panelId,
        },
      },
    };
  }

  await this.updateInput({ panels });
  return panelId;
}

export function showPlaceholderUntil<TPlacementMethodArgs extends IPanelPlacementArgs>(
  this: DashboardContainer,
  newStateComplete: Promise<Partial<PanelState>>,
  placementMethod?: PanelPlacementMethod<TPlacementMethodArgs>,
  placementArgs?: TPlacementMethodArgs
): void {
  const originalPanelState = {
    type: PLACEHOLDER_EMBEDDABLE,
    explicitInput: {
      id: uuidv4(),
      disabledActions: [
        'ACTION_CUSTOMIZE_PANEL',
        'CUSTOM_TIME_RANGE',
        'clonePanel',
        'replacePanel',
        'togglePanel',
      ],
    },
  } as PanelState<EmbeddableInput>;

  const { otherPanels, newPanel: placeholderPanelState } = createPanelState(
    originalPanelState,
    this.input.panels,
    placementMethod,
    placementArgs
  );

  this.updateInput({
    panels: {
      ...otherPanels,
      [placeholderPanelState.explicitInput.id]: placeholderPanelState,
    },
  });

  // wait until the placeholder is ready, then replace it with new panel
  // this is useful as sometimes panels can load faster than the placeholder one (i.e. by value embeddables)
  this.untilEmbeddableLoaded(originalPanelState.explicitInput.id)
    .then(() => newStateComplete)
    .then(async (newPanelState: Partial<PanelState>) => {
      const panelId = await this.replacePanel(placeholderPanelState, newPanelState);

      if (placementArgs?.scrollToPanel) {
        this.setScrollToPanelId(panelId);
        this.setHighlightPanelId(panelId);
      }
    });
}
