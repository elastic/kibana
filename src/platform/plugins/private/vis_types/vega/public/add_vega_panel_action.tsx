/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiIcon, type IconType } from '@elastic/eui';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiHasAppContext } from '@kbn/presentation-publishing';

import type { VegaPluginStartDependencies } from './plugin';
import VegaLogoSVG from './vega_logo.svg';
import { vegaVisType } from './vega_type';

export function getAddVegaPanelAction(deps: VegaPluginStartDependencies) {
  return {
    id: 'addVegaPanelAction',
    getIconType: () => VegaIcon,
    order: 0,
    isCompatible: async () => true,
    execute: async ({ embeddable }: EmbeddableApiContext) => {
      const stateTransferService = deps.embeddable.getStateTransfer();
      stateTransferService.navigateToEditor('visualize', {
        path: '#/create?type=vega',
        state: {
          originatingApp: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().currentAppId
            : '',
          originatingPath: apiHasAppContext(embeddable)
            ? embeddable.getAppContext().getCurrentPath?.()
            : undefined,
          searchSessionId: deps.data.search.session.getSessionId(),
        },
      });
    },
    grouping: [ADD_PANEL_VISUALIZATION_GROUP],
    getDisplayName: () => vegaVisType.titleInWizard,
    getDisplayNameTooltip: () => vegaVisType.description,
  };
}

export const VegaIcon: IconType = (props) => (
  <EuiIcon type={VegaLogoSVG} title={vegaVisType.titleInWizard} size="m" {...props} />
);
