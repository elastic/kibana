/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiHasAppContext } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';

import { ADD_VEGA_PANEL_ACTION_ID } from './constants';
import type { VegaPluginStartDependencies } from './plugin';
import { VegaPanelIcon } from './vega_icon';
import { vegaVisType } from './vega_type';

export class AddVegaPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ADD_VEGA_PANEL_ACTION_ID;
  public readonly id = ADD_VEGA_PANEL_ACTION_ID;
  public order = 0;
  public grouping = [ADD_PANEL_VISUALIZATION_GROUP];

  constructor(private readonly deps: VegaPluginStartDependencies) {}

  public getIconType() {
    return VegaPanelIcon;
  }

  public getDisplayName() {
    return vegaVisType.titleInWizard;
  }

  public getDisplayNameTooltip() {
    return vegaVisType.description;
  }

  public async isCompatible() {
    return true;
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    const stateTransferService = this.deps.embeddable.getStateTransfer();
    stateTransferService.navigateToEditor('visualize', {
      path: '#/create?type=vega',
      state: {
        originatingApp: apiHasAppContext(embeddable) ? embeddable.getAppContext().currentAppId : '',
        originatingPath: apiHasAppContext(embeddable)
          ? embeddable.getAppContext().getCurrentPath?.()
          : undefined,
        searchSessionId: this.deps.data.search.session.getSessionId(),
      },
    });
  }
}
