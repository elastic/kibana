/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiCanAccessViewMode,
  apiHasUniqueId,
  CanAccessViewMode,
  EmbeddableApiContext,
  getInheritedViewMode,
  HasUniqueId,
  PublishesUnifiedSearch,
  PublishesPanelDescription,
  PublishesPanelTitle,
} from '@kbn/presentation-publishing';
import { Action } from '@kbn/ui-actions-plugin/public';
import React from 'react';
import { take } from 'rxjs/operators';
import { apiHasVisualizeConfig, HasVisualizeConfig } from '../embeddable';
import {
  apiHasExpressionVariables,
  HasExpressionVariables,
} from '../embeddable/interfaces/has_expression_variables';
import {
  getApplication,
  getCapabilities,
  getEmbeddable,
  getUiActions,
  getUsageCollection,
} from '../services';
import { DASHBOARD_VISUALIZATION_PANEL_TRIGGER } from '../triggers';

export const ACTION_EDIT_IN_LENS = 'ACTION_EDIT_IN_LENS';

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

type EditInLensActionApi = HasUniqueId &
  HasVisualizeConfig &
  CanAccessViewMode &
  Partial<
    PublishesUnifiedSearch &
      HasExpressionVariables &
      PublishesPanelTitle &
      PublishesPanelDescription
  >;

const compatibilityCheck = (api: EmbeddableApiContext['embeddable']): api is EditInLensActionApi =>
  apiHasUniqueId(api) && apiCanAccessViewMode(api) && apiHasVisualizeConfig(api);

export class EditInLensAction implements Action<EmbeddableApiContext> {
  public id = ACTION_EDIT_IN_LENS;
  public readonly type = ACTION_EDIT_IN_LENS;
  public order = 49;
  public showNotification = true;
  public currentAppId: string | undefined;

  constructor(private readonly timefilter: TimefilterContract) {}

  async execute(context: EmbeddableApiContext): Promise<void> {
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
    if (!compatibilityCheck(embeddable)) return;

    const vis = embeddable.getVis();
    const navigateToLensConfig = await vis.type.navigateToLens?.(vis, this.timefilter);
    // Filters and query set on the visualization level
    const visFilters = vis.data.searchSource?.getField('filter');
    const visQuery = vis.data.searchSource?.getField('query');
    const parentSearchSource = vis.data.searchSource?.getParent();
    const searchFilters = parentSearchSource?.getField('filter') ?? visFilters;
    const searchQuery = parentSearchSource?.getField('query') ?? visQuery;
    const title = vis.title || embeddable.panelTitle?.getValue();
    const panelTimeRange = embeddable.timeRange$?.getValue();
    const updatedWithMeta = {
      ...navigateToLensConfig,
      title,
      visTypeTitle: vis.type.title,
      embeddableId: embeddable.uuid,
      originatingApp: this.currentAppId,
      searchFilters,
      searchQuery,
      isEmbeddable: true,
      description: vis.description || embeddable.panelDescription?.getValue(),
      panelTimeRange,
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

  getDisplayName(): string {
    return displayName;
  }

  MenuItem = MenuItem;

  getIconType(): string {
    return 'merge';
  }

  async isCompatible(context: EmbeddableApiContext) {
    const { embeddable } = context;
    if (!compatibilityCheck(embeddable) || getInheritedViewMode(embeddable) !== ViewMode.EDIT)
      return false;

    const vis = embeddable.getVis();
    const { visualize } = getCapabilities();
    if (!vis || !visualize.show) {
      return false;
    }

    // determine whether navigation to lens is available
    if (
      apiHasExpressionVariables(embeddable) &&
      embeddable.getExpressionVariables()?.canNavigateToLens
    ) {
      return true;
    }
    return Boolean(await vis.type.navigateToLens?.(vis, this.timefilter));
  }
}
