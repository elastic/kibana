/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  apiHasAppContext,
  EmbeddableApiContext,
  HasType,
  HasAppContext,
} from '@kbn/presentation-publishing';
import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiHasType } from '@kbn/presentation-publishing';
import { apiCanAddNewPanel, CanAddNewPanel } from '@kbn/presentation-containers';
import { VisGroups } from '../vis_types/vis_groups_enum';
import type { TypesStart } from '../vis_types/types_service';
import { showNewVisModal } from '../wizard/show_new_vis';

export const ADD_AGG_VIS_ACTION_ID = 'ADD_AGG_VIS';

export type AddAggVisualizationPanelActionApi = HasType & CanAddNewPanel & HasAppContext;

const isApiCompatible = (api: unknown | null): api is AddAggVisualizationPanelActionApi => {
  return apiHasType(api) && apiCanAddNewPanel(api) && apiHasAppContext(api);
};

export class AddAggVisualizationPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ADD_AGG_VIS_ACTION_ID;
  public readonly id = ADD_AGG_VIS_ACTION_ID;
  public readonly grouping = [COMMON_EMBEDDABLE_GROUPING.legacy];
  private readonly aggVisualizationCreationEnabled: boolean;

  public readonly order = 20;

  constructor(visTypes: TypesStart) {
    this.aggVisualizationCreationEnabled = visTypes.all().some((type) => {
      return !type.disableCreate && type.group === VisGroups.AGGBASED;
    });
  }

  public getIconType() {
    return 'visualizeApp';
  }

  public getDisplayName() {
    return i18n.translate('visualizations.uiAction.addAggVis.displayName', {
      defaultMessage: 'Aggregation based',
    });
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    // only mark this action as compatible in environments that have agg based visualizations creation enabled
    return this.aggVisualizationCreationEnabled && isApiCompatible(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!isApiCompatible(embeddable)) {
      throw new IncompatibleActionError();
    }

    showNewVisModal({
      originatingApp: embeddable.getAppContext().currentAppId,
      outsideVisualizeApp: true,
      showAggsSelection: true,
    });
  }
}
