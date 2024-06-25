/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableApiContext, HasType } from '@kbn/presentation-publishing';
import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiHasType } from '@kbn/presentation-publishing';
import { apiCanAddNewPanel, CanAddNewPanel } from '@kbn/presentation-containers';
import { showNewVisModal } from '../wizard/show_new_vis';

const ADD_AGG_VIS_ACTION_ID = 'ADD_AGG_VIS';

type AddAggVisualizationPanelActionApi = HasType & CanAddNewPanel;

const isApiCompatible = (api: unknown | null): api is AddAggVisualizationPanelActionApi => {
  return apiHasType(api) && apiCanAddNewPanel(api);
};

export class AddAggVisualizationPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ADD_AGG_VIS_ACTION_ID;
  public readonly id = ADD_AGG_VIS_ACTION_ID;
  public readonly grouping = [COMMON_EMBEDDABLE_GROUPING.legacy];

  public readonly order = 20;

  constructor() {}

  public getIconType() {
    return 'visualizeApp';
  }

  public getDisplayName() {
    return i18n.translate('visulizations.uiAction.addAggVis.displayName', {
      defaultMessage: 'Aggregation based',
    });
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return isApiCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!isApiCompatible(embeddable)) {
      throw new IncompatibleActionError();
    }

    showNewVisModal({
      originatingApp: 'dashboards',
      outsideVisualizeApp: true,
      showAggsSelection: true,
    });
  }
}
