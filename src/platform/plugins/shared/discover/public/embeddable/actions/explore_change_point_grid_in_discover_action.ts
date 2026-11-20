/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  EmbeddableApiContext,
  HasType,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { apiHasType, apiIsOfType } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { map } from 'rxjs';
import { CHANGE_POINT_GRID_EMBEDDABLE_TYPE, type DiscoverAppLocator } from '../../../common';
import { getChangePointGridDiscoverLocatorParams } from '../change_point_grid/get_change_point_grid_discover_locator_params';
import type { ChangePointGridSearchRequest } from '../change_point_grid/resolve_change_point_grid_search_request';
import { ACTION_EXPLORE_CHANGE_POINT_GRID_IN_DISCOVER } from '../constants';

interface ChangePointGridExploreApi extends HasType {
  esql$: PublishingSubject<AggregateQuery[]>;
  searchContext$: PublishingSubject<ChangePointGridSearchRequest | undefined>;
  applyDashboardContext: boolean;
  parentApi?: unknown;
}

const isChangePointGridExploreApi = (api: unknown): api is ChangePointGridExploreApi => {
  if (!apiHasType(api) || !apiIsOfType(api, CHANGE_POINT_GRID_EMBEDDABLE_TYPE)) {
    return false;
  }
  const candidate = api as Partial<ChangePointGridExploreApi>;
  return Boolean(
    candidate.esql$ &&
      candidate.searchContext$ &&
      typeof candidate.applyDashboardContext === 'boolean'
  );
};

const getExploreTarget = (
  api: ChangePointGridExploreApi
): { esql: string; searchContext: ChangePointGridSearchRequest } | undefined => {
  const esql = api.esql$.getValue()[0]?.esql;
  const searchContext = api.searchContext$.getValue();
  if (!esql || !searchContext) {
    return undefined;
  }
  // A static panel stores variable values without the dashboard controls Discover needs to restore them.
  if (!api.applyDashboardContext && searchContext.esqlVariables.length > 0) {
    return undefined;
  }
  return { esql, searchContext };
};

export class ExploreChangePointGridInDiscoverAction implements Action<EmbeddableApiContext> {
  public readonly id = ACTION_EXPLORE_CHANGE_POINT_GRID_IN_DISCOVER;
  public readonly type = ACTION_EXPLORE_CHANGE_POINT_GRID_IN_DISCOVER;
  public readonly order = 20;

  constructor(
    private readonly application: ApplicationStart,
    private readonly locator: DiscoverAppLocator
  ) {}

  getDisplayName(): string {
    return i18n.translate('discover.changePointGrid.action.exploreInDiscover.displayName', {
      defaultMessage: 'Explore in Discover',
    });
  }

  getIconType(): string | undefined {
    return 'productDiscover';
  }

  async execute({ embeddable }: EmbeddableApiContext): Promise<void> {
    if (!isChangePointGridExploreApi(embeddable)) {
      return;
    }
    const target = getExploreTarget(embeddable);
    if (!target) {
      return;
    }

    await this.locator.navigate(
      getChangePointGridDiscoverLocatorParams({
        esql: target.esql,
        searchContext: target.searchContext,
        parentApi: embeddable.parentApi,
      })
    );
  }

  async isCompatible({ embeddable }: EmbeddableApiContext) {
    const { capabilities } = this.application;
    const hasDiscoverPermissions = Boolean(
      (capabilities.discover_v2.show as boolean) || (capabilities.discover_v2.save as boolean)
    );
    if (!hasDiscoverPermissions || !isChangePointGridExploreApi(embeddable)) {
      return false;
    }
    return Boolean(getExploreTarget(embeddable));
  }

  couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return isChangePointGridExploreApi(embeddable);
  }

  getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    if (!isChangePointGridExploreApi(embeddable)) {
      return;
    }
    return embeddable.searchContext$.pipe(map(() => undefined));
  }
}
