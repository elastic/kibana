/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiComboBox,
  EuiSplitPanel,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { dashboardServiceProvider, type DashboardItem } from './dashboard_service';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import { ALERT_LINK_DASHBOARDS_TITLE } from '../translations';
import { type RuleDashboardsPlugins } from '../types';

export interface RuleDashboardsPluginsProps {
  plugins: RuleDashboardsPlugins;
}

interface DashboardOption {
  value: string;
  label: string;
}

export const RuleDashboards = ({ plugins }: RuleDashboardsPluginsProps) => {
  const { dashboard: dashboardService } = plugins;
  const { formData } = useRuleFormState();
  const dispatch = useRuleFormDispatch();
  const dashboardsFormData = useMemo(
    () => formData.artifacts?.dashboards ?? [],
    [formData.artifacts]
  );
  // const dashboardsFormData = formData.dashboards;

  const [dashboardList, setDashboardList] = useState<DashboardOption[] | undefined>();

  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<EuiComboBoxOptionOption<string>> | undefined
  >();

  useEffect(() => {
    if ((dashboardsFormData ?? []).length > 0 && dashboardService) {
      const fetchDashboardTitles = async () => {
        const dashboardsWithTitles = await Promise.all(
          (dashboardsFormData ?? []).map(async (dashboard) => ({
            label: (
              await dashboardServiceProvider(dashboardService).fetchDashboard(dashboard.id)
            )?.attributes.title,
            value: dashboard.id,
          }))
        );
        setSelectedDashboards(dashboardsWithTitles);
      };

      fetchDashboardTitles();
    }
  }, [dashboardsFormData, dashboardService]);

  const onChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const artifacts = {
      ...formData.artifacts,
      dashboards: selectedOptions.map((selectedOption) => ({
        id: selectedOption.value,
      })),
    };

    setSelectedDashboards(selectedOptions);
    dispatch({
      type: 'setRuleProperty',
      payload: {
        property: 'artifacts',
        value: artifacts,
      },
    });
  };

  const getDashboardItem = (dashboard: DashboardItem) => ({
    value: dashboard.id,
    label: dashboard.attributes.title,
  });

  const loadDashboards = useCallback(async () => {
    if (dashboardService) {
      const dashboards = await dashboardServiceProvider(dashboardService).fetchDashboards();
      const dashboardOptions = (dashboards ?? []).map((dashboard: DashboardItem) =>
        getDashboardItem(dashboard)
      );
      setDashboardList(dashboardOptions);
    }
  }, [dashboardService]);

  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  return (
    <>
      <EuiSplitPanel.Inner>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h6>{ALERT_LINK_DASHBOARDS_TITLE}</h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiComboBox
            fullWidth
            options={dashboardList}
            selectedOptions={selectedDashboards}
            onChange={onChange}
            data-test-subj="ruleLinkedDashboards"
          />
        </EuiFlexItem>
      </EuiSplitPanel.Inner>
    </>
  );
};
