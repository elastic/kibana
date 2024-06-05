/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableApiContext, apiHasType, type HasType } from '@kbn/presentation-publishing';
import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { DASHBOARD_APP_ID } from '../dashboard_constants';
import { pluginServices } from '../services/plugin_services';

const ADD_AGG_VIS_ACTION_ID = 'ADD_AGG_VIS';

type AddAggVisualizationPanelActionApi = HasType;

const isApiCompatible = (api: unknown | null): api is AddAggVisualizationPanelActionApi => {
  return apiHasType(api) && api.type === 'dashboard';
};

export class AddAggVisualizationPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ADD_AGG_VIS_ACTION_ID;
  public readonly id = ADD_AGG_VIS_ACTION_ID;
  public readonly grouping = [COMMON_EMBEDDABLE_GROUPING.legacy];

  private showNewVisModal;

  constructor() {
    ({
      visualizations: { showNewVisModal: this.showNewVisModal },
    } = pluginServices.getServices());
  }

  public getIconType() {
    return 'visualizeApp';
  }

  public getDisplayName() {
    return i18n.translate('dashboard.uiAction.addAggVis.displayName', {
      defaultMessage: 'Aggregation based',
    });
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isApiCompatible(embeddable)) {
        return reject(new IncompatibleActionError());
      }

      this.showNewVisModal({
        originatingApp: DASHBOARD_APP_ID,
        outsideVisualizeApp: true,
        showAggsSelection: true,
        onClose: resolve,
      });
    });
  }
}
