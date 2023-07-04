/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';

import { DashboardLinkInput } from '../../dashboard_link/types';
import { DASHBOARD_LINK_EMBEDDABLE_TYPE } from '../../dashboard_link/embeddable/dashboard_link_embeddable_factory';
import { LinkInput, LinkPanelState, NavigationContainerInput } from '../../types';
import { getNextPanelOrder } from '../navigation_container_helpers';
import { ExternalLinkInput } from '../../external_link/types';
import { EXTERNAL_LINK_EMBEDDABLE_TYPE } from '../../external_link/embeddable/external_link_embeddable_factory';

export type ControlGroupInputBuilder = typeof navigationContainerInputBuilder;

export const addLink = (initialInput: Partial<NavigationContainerInput>, linkProps: LinkInput) => {
  if ((linkProps as DashboardLinkInput).dashboardId) {
    navigationContainerInputBuilder.addDashboardLink(initialInput, linkProps as DashboardLinkInput);
  } else {
    navigationContainerInputBuilder.addExternalLink(initialInput, linkProps as ExternalLinkInput);
  }
};

export const navigationContainerInputBuilder = {
  addDashboardLink: (
    initialInput: Partial<NavigationContainerInput>,
    linkProps: Pick<DashboardLinkInput, 'label' | 'dashboardId'>
  ) => {
    const panelState: LinkPanelState = {
      type: DASHBOARD_LINK_EMBEDDABLE_TYPE,
      order: getNextPanelOrder(initialInput.panels ?? {}),
      explicitInput: {
        id: uuidv4(),
        ...linkProps,
      },
    };
    initialInput.panels = {
      ...initialInput.panels,
      [panelState.explicitInput.id]: panelState,
    };
  },
  addExternalLink: (
    initialInput: Partial<NavigationContainerInput>,
    linkProps: Pick<ExternalLinkInput, 'label' | 'url'>
  ) => {
    const panelState: LinkPanelState = {
      type: EXTERNAL_LINK_EMBEDDABLE_TYPE,
      order: getNextPanelOrder(initialInput.panels ?? {}),
      explicitInput: {
        id: uuidv4(),
        ...linkProps,
      },
    };
    initialInput.panels = {
      ...initialInput.panels,
      [panelState.explicitInput.id]: panelState,
    };
  },
};
