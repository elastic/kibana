/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';

import { getNextPanelOrder } from '../navigation_container_helpers';
import { LinkPanelState, NavigationContainerInput } from '../../types';
import { DASHBOARD_LINK_EMBEDDABLE_TYPE } from '../../dashboard_link/embeddable/dashboard_link_embeddable_factory';

export const addLink = (
  initialInput: Partial<NavigationContainerInput>,
  link: { type: string; destination: string; label?: string }
) => {
  const panelState: LinkPanelState = {
    type: link.type,
    order: getNextPanelOrder(initialInput.panels ?? {}),
    explicitInput: {
      id: uuidv4(),
      label: link.label,
      ...(link.type === DASHBOARD_LINK_EMBEDDABLE_TYPE
        ? { dashboardId: link.destination }
        : { url: link.destination }),
    },
  };
  initialInput.panels = {
    ...initialInput.panels,
    [panelState.explicitInput.id]: panelState,
  };
};
