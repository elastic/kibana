/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  isReferenceOrValueEmbeddable,
  PanelNotFoundError,
  reactEmbeddableRegistryHasKey,
} from '@kbn/embeddable-plugin/public';
import { apiPublishesPanelTitle, getPanelTitle } from '@kbn/presentation-publishing';
import { filter, map, max } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { DashboardPanelState } from '../../../../common';
import { dashboardClonePanelActionStrings } from '../../../dashboard_actions/_dashboard_actions_strings';
import { pluginServices } from '../../../services/plugin_services';
import { placeClonePanel } from '../../component/panel_placement';
import { DashboardContainer } from '../dashboard_container';

const duplicateLegacyInput = async (
  dashboard: DashboardContainer,
  panelToClone: DashboardPanelState,
  idToDuplicate: string
) => {
  const embeddable = dashboard.getChild(idToDuplicate);
  if (!panelToClone || !embeddable) throw new PanelNotFoundError();

  const newTitle = await incrementPanelTitle(dashboard, embeddable.getTitle() || '');
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
};

const duplicateReactEmbeddableInput = async (
  dashboard: DashboardContainer,
  panelToClone: DashboardPanelState,
  idToDuplicate: string
) => {
  const child = dashboard.reactEmbeddableChildren.value[idToDuplicate];
  if (!child) throw new PanelNotFoundError();

  const lastTitle = apiPublishesPanelTitle(child) ? getPanelTitle(child) ?? '' : '';
  const newTitle = await incrementPanelTitle(dashboard, lastTitle);
  const id = uuidv4();
  const serializedState = await child.serializeState();
  return {
    type: panelToClone.type,
    explicitInput: {
      ...panelToClone.explicitInput,
      ...serializedState.rawState,
      title: newTitle,
      id,
    },
  };
};

export async function duplicateDashboardPanel(this: DashboardContainer, idToDuplicate: string) {
  const panelToClone = this.getInput().panels[idToDuplicate] as DashboardPanelState;

  const duplicatedPanelState = reactEmbeddableRegistryHasKey(panelToClone.type)
    ? await duplicateReactEmbeddableInput(this, panelToClone, idToDuplicate)
    : await duplicateLegacyInput(this, panelToClone, idToDuplicate);

  pluginServices.getServices().notifications.toasts.addSuccess({
    title: dashboardClonePanelActionStrings.getSuccessMessage(),
    'data-test-subj': 'addObjectToContainerSuccess',
  });

  const { newPanelPlacement, otherPanels } = placeClonePanel({
    width: panelToClone.gridData.w,
    height: panelToClone.gridData.h,
    currentPanels: this.getInput().panels,
    placeBesideId: panelToClone.explicitInput.id,
  });

  const newPanel = {
    ...duplicatedPanelState,
    gridData: {
      ...newPanelPlacement,
      i: duplicatedPanelState.explicitInput.id,
    },
  };

  this.updateInput({
    panels: {
      ...otherPanels,
      [newPanel.explicitInput.id]: newPanel,
    },
  });
}

export const incrementPanelTitle = async (dashboard: DashboardContainer, rawTitle: string) => {
  if (rawTitle === '') return '';

  const clonedTag = dashboardClonePanelActionStrings.getClonedTag();
  const cloneRegex = new RegExp(`\\(${clonedTag}\\)`, 'g');
  const cloneNumberRegex = new RegExp(`\\(${clonedTag} [0-9]+\\)`, 'g');
  const baseTitle = rawTitle.replace(cloneNumberRegex, '').replace(cloneRegex, '').trim();
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
};
