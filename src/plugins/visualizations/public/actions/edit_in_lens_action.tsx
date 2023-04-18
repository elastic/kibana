/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { take } from 'rxjs/operators';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { IEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import { VisualizeEmbeddable } from '../embeddable';
import { DASHBOARD_VISUALIZATION_PANEL_TRIGGER } from '../triggers';
import { getUiActions, getApplication, getEmbeddable, getUsageCollection } from '../services';

export const ACTION_EDIT_IN_LENS = 'ACTION_EDIT_IN_LENS';

export interface EditInLensContext {
  embeddable: IEmbeddable;
}

const displayName = i18n.translate('visualizations.actions.editInLens.displayName', {
  defaultMessage: 'Convert to Lens',
});

const MenuItem: React.FC = () => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>{displayName}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={'accent'}>
          {i18n.translate('visualizations.tonNavMenu.tryItBadgeText', {
            defaultMessage: 'Try it',
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const isVisualizeEmbeddable = (embeddable: IEmbeddable): embeddable is VisualizeEmbeddable => {
  return 'getVis' in embeddable;
};

export class EditInLensAction implements Action<EditInLensContext> {
  public id = ACTION_EDIT_IN_LENS;
  public readonly type = ACTION_EDIT_IN_LENS;
  public order = 49;
  public showNotification = true;
  public currentAppId: string | undefined;

  constructor(private readonly timefilter: TimefilterContract) {}

  async execute(context: ActionExecutionContext<EditInLensContext>): Promise<void> {
    const application = getApplication();
    if (application?.currentAppId$) {
      application.currentAppId$
        .pipe(take(1))
        .subscribe((appId: string | undefined) => (this.currentAppId = appId));
      application.currentAppId$.subscribe(() => {
        getEmbeddable().getStateTransfer().isTransferInProgress = false;
      });
    }
    const { embeddable } = context;
    if (isVisualizeEmbeddable(embeddable)) {
      const vis = embeddable.getVis();
      const navigateToLensConfig = await vis.type.navigateToLens?.(vis, this.timefilter);
      // Filters and query set on the visualization level
      const visFilters = vis.data.searchSource?.getField('filter');
      const visQuery = vis.data.searchSource?.getField('query');
      const parentSearchSource = vis.data.searchSource?.getParent();
      const searchFilters = parentSearchSource?.getField('filter') ?? visFilters;
      const searchQuery = parentSearchSource?.getField('query') ?? visQuery;
      const title = vis.title || embeddable.getOutput().title;
      const updatedWithMeta = {
        ...navigateToLensConfig,
        title,
        visTypeTitle: vis.type.title,
        embeddableId: embeddable.id,
        originatingApp: this.currentAppId,
        searchFilters,
        searchQuery,
        isEmbeddable: true,
        description: vis.description || embeddable.getOutput().description,
        panelTimeRange: embeddable.getInput()?.timeRange,
      };
      if (navigateToLensConfig) {
        if (this.currentAppId) {
          getUsageCollection().reportUiCounter(
            this.currentAppId,
            METRIC_TYPE.CLICK,
            ACTION_EDIT_IN_LENS
          );
        }
        getEmbeddable().getStateTransfer().isTransferInProgress = true;
        getUiActions().getTrigger(DASHBOARD_VISUALIZATION_PANEL_TRIGGER).exec(updatedWithMeta);
      }
    }
  }

  getDisplayName(context: ActionExecutionContext<EditInLensContext>): string {
    return displayName;
  }

  MenuItem = MenuItem;

  getIconType(context: ActionExecutionContext<EditInLensContext>): string | undefined {
    return 'merge';
  }

  async isCompatible(context: ActionExecutionContext<EditInLensContext>) {
    const { embeddable } = context;
    if (!isVisualizeEmbeddable(embeddable)) {
      return false;
    }
    const vis = embeddable.getVis();
    if (!vis) {
      return false;
    }
    const canNavigateToLens =
      embeddable.getExpressionVariables?.()?.canNavigateToLens ??
      (await vis.type.navigateToLens?.(vis, this.timefilter));
    return Boolean(canNavigateToLens && embeddable.getInput().viewMode === ViewMode.EDIT);
  }
}
