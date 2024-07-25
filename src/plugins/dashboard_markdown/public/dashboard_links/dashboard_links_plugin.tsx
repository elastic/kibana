/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLink } from '@elastic/eui';
import { getDashboardLocatorParamsFromEmbeddable } from '@kbn/dashboard-plugin/public';
import type {
  DashboardContainer,
  DashboardLocatorParams,
} from '@kbn/dashboard-plugin/public/dashboard_container';
import { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';
import React, { useMemo } from 'react';
import { MarkdownEditorApi } from '../types';
import { DashboardLinkEditorUi } from './dashboard_link_editor_ui';
import { DashboardLinkParser } from './dashboard_link_parser';

export const DASHBOARD_LINK_PREFIX = '!{dashboard_link';
export interface DashboardLinkConfig
  extends Partial<Omit<DashboardDrilldownOptions, 'openInNewTab'>> {
  name?: string;
  id?: string;
}
export const getDashboardLinksPlugin = (api: MarkdownEditorApi) => {
  const parentDashboard = api.parentApi as DashboardContainer;

  const DashboardLinkRenderer = ({ name, id }: DashboardLinkConfig) => {
    const locator = parentDashboard.locator;

    const locatorParams = useMemo(() => {
      const linkOptions = {
        ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      } as DashboardDrilldownOptions;
      const params: DashboardLocatorParams = {
        dashboardId: id,
        ...getDashboardLocatorParamsFromEmbeddable(
          api as Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>,
          linkOptions
        ),
      };
      return params;
    }, [id]);

    return (
      <EuiLink
        onClick={() => {
          if (!locator) return;
          locator.navigate(locatorParams);
        }}
      >
        {name}
      </EuiLink>
    );
  };

  return {
    DashboardLinkRenderer,
    DashboardLinkParser,
    DashboardLinkEditorUi,
  };
};
