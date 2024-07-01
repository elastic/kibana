/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isReferenceOrValueEmbeddable, PanelNotFoundError } from '@kbn/embeddable-plugin/public';
import { apiHasSnapshottableState } from '@kbn/presentation-containers/interfaces/serialized_state';
import {
  apiHasInPlaceLibraryTransforms,
  apiHasLibraryTransforms,
  apiPublishesPanelTitle,
  getPanelTitle,
  stateHasTitles,
} from '@kbn/presentation-publishing';
import { filter, map, max } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { DashboardPanelState, prefixReferencesFromPanel } from '../../../../common';
import { dashboardClonePanelActionStrings } from '../../../dashboard_actions/_dashboard_actions_strings';
import { pluginServices } from '../../../services/plugin_services';
import { placeClonePanel } from '../../panel_placement';
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
  const id = uuidv4();
  const child = dashboard.children$.value[idToDuplicate];
  const lastTitle = apiPublishesPanelTitle(child) ? getPanelTitle(child) ?? '' : '';
  const newTitle = await incrementPanelTitle(dashboard, lastTitle);

  /**
   * For react embeddables that have library transforms, we need to ensure
   * to clone them with serialized state and references.
   *
   * TODO: remove this section once all by reference capable react embeddables
   * use in-place library transforms
   */
  if (apiHasLibraryTransforms(child)) {
    const byValueSerializedState = await child.getByValueState();
    if (panelToClone.references) {
      dashboard.savedObjectReferences.push(
        ...prefixReferencesFromPanel(id, panelToClone.references)
      );
    }
    return {
      type: panelToClone.type,
      explicitInput: {
        ...byValueSerializedState,
        title: newTitle,
        id,
      },
    };
  }

  const runtimeSnapshot = (() => {
    if (apiHasInPlaceLibraryTransforms(child)) return child.getByValueRuntimeSnapshot();
    return apiHasSnapshottableState(child) ? child.snapshotRuntimeState() : {};
  })();
  if (stateHasTitles(runtimeSnapshot)) runtimeSnapshot.title = newTitle;

  dashboard.setRuntimeStateForChild(id, runtimeSnapshot);
  return {
    type: panelToClone.type,
    explicitInput: {
      id,
    },
  };
};

export async function duplicateDashboardPanel(this: DashboardContainer, idToDuplicate: string) {
  const {
    notifications: { toasts },
    embeddable: { reactEmbeddableRegistryHasKey },
  } = pluginServices.getServices();
  const panelToClone = await this.getDashboardPanelFromId(idToDuplicate);

  const duplicatedPanelState = reactEmbeddableRegistryHasKey(panelToClone.type)
    ? await duplicateReactEmbeddableInput(this, panelToClone, idToDuplicate)
    : await duplicateLegacyInput(this, panelToClone, idToDuplicate);

  toasts.addSuccess({
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
