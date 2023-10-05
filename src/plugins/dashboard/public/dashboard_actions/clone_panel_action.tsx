/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { filter, map, max } from 'lodash';

import {
  ViewMode,
  PanelState,
  IEmbeddable,
  PanelNotFoundError,
  EmbeddableInput,
  isErrorEmbeddable,
  isReferenceOrValueEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { type DashboardPanelState } from '../../common';
import { pluginServices } from '../services/plugin_services';
import { dashboardClonePanelActionStrings } from './_dashboard_actions_strings';
import { placeClonePanel } from '../dashboard_container/component/panel_placement';
import { DASHBOARD_CONTAINER_TYPE, type DashboardContainer } from '../dashboard_container';

export const ACTION_CLONE_PANEL = 'clonePanel';

export interface ClonePanelActionContext {
  embeddable: IEmbeddable;
}

export class ClonePanelAction implements Action<ClonePanelActionContext> {
  public readonly type = ACTION_CLONE_PANEL;
  public readonly id = ACTION_CLONE_PANEL;
  public order = 45;

  private toastsService;

  constructor() {
    ({
      notifications: { toasts: this.toastsService },
    } = pluginServices.getServices());
  }

  public getDisplayName({ embeddable }: ClonePanelActionContext) {
    if (!embeddable.getRoot() || !embeddable.getRoot().isContainer) {
      throw new IncompatibleActionError();
    }
    return dashboardClonePanelActionStrings.getDisplayName();
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

    // Clone panel input
    const clonedPanelState: PanelState<EmbeddableInput> = await (async () => {
      const newTitle = await this.getCloneTitle(embeddable, embeddable.getTitle() || '');
      const id = uuidv4();
      if (isReferenceOrValueEmbeddable(embeddable)) {
        return {
          type: embeddable.type,
          explicitInput: {
            ...(await embeddable.getInputAsValueType()),
            hidePanelTitles: panelToClone.explicitInput.hidePanelTitles,
            ...(newTitle ? { title: newTitle } : {}),
            id,
          },
        };
      }
      return {
        type: embeddable.type,
        explicitInput: {
          ...panelToClone.explicitInput,
          title: newTitle,
          id,
        },
      };
    })();
    this.toastsService.addSuccess({
      title: dashboardClonePanelActionStrings.getSuccessMessage(),
      'data-test-subj': 'addObjectToContainerSuccess',
    });

    const { newPanelPlacement, otherPanels } = placeClonePanel({
      width: panelToClone.gridData.w,
      height: panelToClone.gridData.h,
      currentPanels: dashboard.getInput().panels,
      placeBesideId: panelToClone.explicitInput.id,
    });

    const newPanel = {
      ...clonedPanelState,
      gridData: {
        ...newPanelPlacement,
        i: clonedPanelState.explicitInput.id,
      },
    };

    dashboard.updateInput({
      panels: {
        ...otherPanels,
        [newPanel.explicitInput.id]: newPanel,
      },
    });
  }

  private async getCloneTitle(embeddable: IEmbeddable, rawTitle: string) {
    if (rawTitle === '') return ''; // If

    const clonedTag = dashboardClonePanelActionStrings.getClonedTag();
    const cloneRegex = new RegExp(`\\(${clonedTag}\\)`, 'g');
    const cloneNumberRegex = new RegExp(`\\(${clonedTag} [0-9]+\\)`, 'g');
    const baseTitle = rawTitle.replace(cloneNumberRegex, '').replace(cloneRegex, '').trim();
    const dashboard: DashboardContainer = embeddable.getRoot() as DashboardContainer;
    const similarTitles = filter(await dashboard.getPanelTitles(), (title: string) => {
      return title.startsWith(baseTitle);
    });

    const cloneNumbers = map(similarTitles, (title: string) => {
      if (title.match(cloneRegex)) return 0;
      const cloneTag = title.match(cloneNumberRegex);
      return cloneTag ? parseInt(cloneTag[0].replace(/[^0-9.]/g, ''), 10) : -1;
    });
    const similarBaseTitlesCount = max(cloneNumbers) || 0;

    return similarBaseTitlesCount < 0
      ? baseTitle + ` (${clonedTag})`
      : baseTitle + ` (${clonedTag} ${similarBaseTitlesCount + 1})`;
  }
}
