/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import uuid from 'uuid';

import { CoreStart } from 'src/core/public';
import { Action, IncompatibleActionError } from '../../services/ui_actions';
import {
  ViewMode,
  PanelState,
  IEmbeddable,
  PanelNotFoundError,
  EmbeddableInput,
  isErrorEmbeddable,
  isReferenceOrValueEmbeddable,
  EmbeddableOutput,
} from '../../services/embeddable';
import {
  placePanelBeside,
  IPanelPlacementBesideArgs,
} from '../embeddable/panel/dashboard_panel_placement';
import { dashboardClonePanelAction } from '../../dashboard_strings';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE, DashboardContainer } from '..';

export const ACTION_CLONE_PANEL = 'clonePanel';

export interface ClonePanelActionContext {
  embeddable: IEmbeddable;
}

export class ClonePanelAction implements Action<ClonePanelActionContext> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;

  constructor(private core: CoreStart) {}

  public getDisplayName({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardClonePanelAction.getDisplayName();
  }

  public getIconType({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return 'copy';
  }

  public async isCompatible({ embeddable }: ClonePanelActionContext) {
    return Boolean(
      !isErrorEmbeddable(embeddable) &&
        embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
        embeddable.getRoot() &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type === DASHBOARD_CONTAINER_TYPE &&
        embeddable.getOutput().editable
    );
  }

  public async execute({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }

    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToClone = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;
    if (!panelToClone) {
      throw new PanelNotFoundError();
    }

    dashboard.showPlaceholderUntil(
      this.cloneEmbeddable(panelToClone, embeddable),
      placePanelBeside,
      {
        width: panelToClone.gridData.w,
        height: panelToClone.gridData.h,
        currentPanels: dashboard.getInput().panels,
        placeBesideId: panelToClone.explicitInput.id,
      } as IPanelPlacementBesideArgs
    );
  }

  private async cloneEmbeddable(
    panelToClone: DashboardPanelState,
    embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>
  ): Promise<Partial<PanelState>> {
    // console.log('Panel to Clone:', panelToClone);

    let explicitInputCopy: Partial<EmbeddableInput>;
    if (isReferenceOrValueEmbeddable(embeddable) && embeddable.inputIsRefType) {
      // console.log('saved to library');
      explicitInputCopy = await embeddable.getInputAsValueType();
    } else {
      // console.log('not saved to library');
      explicitInputCopy = panelToClone.explicitInput;
    }
    // console.log('----> Explicit Input:', explicitInputCopy);

    const panelState: PanelState<EmbeddableInput> = {
      type: embeddable.type,
      explicitInput: {
        ...explicitInputCopy,
        id: uuid.v4(),
      },
    };
    // console.log('Panel State:', panelState);

    this.core.notifications.toasts.addSuccess({
      title: dashboardClonePanelAction.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
    return panelState;
  }
}
