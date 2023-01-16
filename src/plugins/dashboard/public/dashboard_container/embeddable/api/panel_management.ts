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
import uuid from 'uuid';

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
) {
  let panels;
  if (generateNewId) {
    // replace panel can be called with generateNewId in order to totally destroy and recreate the embeddable
    panels = { ...this.input.panels };
    delete panels[previousPanelState.explicitInput.id];
    const newId = uuid.v4();
    panels[newId] = {
      ...previousPanelState,
      ...newPanelState,
      gridData: {
        ...previousPanelState.gridData,
        i: newId,
      },
      explicitInput: {
        ...newPanelState.explicitInput,
        id: newId,
      },
    };
  } else {
    // Because the embeddable type can change, we have to operate at the container level here
    panels = {
      ...this.input.panels,
      [previousPanelState.explicitInput.id]: {
        ...previousPanelState,
        ...newPanelState,
        gridData: {
          ...previousPanelState.gridData,
        },
        explicitInput: {
          ...newPanelState.explicitInput,
          id: previousPanelState.explicitInput.id,
        },
      },
    };
  }

  return this.updateInput({
    panels,
    lastReloadRequestTime: new Date().getTime(),
  });
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
      id: uuid.v4(),
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
    .then((newPanelState: Partial<PanelState>) =>
      this.replacePanel(placeholderPanelState, newPanelState)
    );
}
