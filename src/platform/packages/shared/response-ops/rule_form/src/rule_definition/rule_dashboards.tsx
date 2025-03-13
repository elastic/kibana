/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiComboBox, EuiSplitPanel, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { RuleTypeParams } from '@kbn/alerting-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { dashboardServiceProvider, type DashboardItem } from './dashboard_service';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';

export const RuleDashboards = ( { plugins }) => {
  const { featureFlags, dashboard: dashboardService } = plugins;
  const { formData } = useRuleFormState();
  const dispatch = useRuleFormDispatch();
  const params = formData.params as RuleTypeParams & { dashboards?: DashboardItem[] };

  const isLinkedDashboardsEnabled = featureFlags.getBooleanValue('rca.linkedDashboards', false);

  const [dashboardList, setDashboardList] = useState<
    Array<{
      value: string;
      label: string;
    }>
  >();

  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<{ label: string; value: string }> | undefined
  >();

  useEffect(() => {
    if((params.dashboards ?? []).length > 0) {
      const fetchDashboardTitles = async () => {
        const dashboardsWithTitles = await Promise.all(
          (params.dashboards ?? []).map(async (dashboard) => ({
            label: (await dashboardServiceProvider(dashboardService).fetchDashboard(dashboard.id))?.attributes.title,
            value: dashboard.id,
          }))
        );
        setSelectedDashboards(dashboardsWithTitles);
      };
  
      fetchDashboardTitles();
    }
    
  }, [params.dashboards, dashboardService]);

  const onChange = (selectedOptions: any[]) => {
    setSelectedDashboards(selectedOptions);
    dispatch({
      type: 'setParamsProperty',
      payload: {
        property: 'dashboards',
        value: selectedOptions.map((selectedOption) => ({ id: selectedOption.value, title: selectedOption.label }))
      },
    });
  };

  const getDashboardItem = (dashboard: DashboardItem) => ({
    value: dashboard.id,
    label: dashboard.attributes.title,
  });

  const loadDashboards = useCallback(async () => {
    const dashboards = await dashboardServiceProvider(dashboardService).fetchDashboards();
    const dashboardOptions = (dashboards ?? []).map((dashboard: DashboardItem) =>
      getDashboardItem(dashboard)
    );
    setDashboardList(dashboardOptions);
  }, [dashboardService]);

  useEffect(() => {
    if (isLinkedDashboardsEnabled) {
      loadDashboards();
    }
  }, [loadDashboards]);

  return (
    <>
      {isLinkedDashboardsEnabled && (
      <EuiSplitPanel.Inner>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h6>
              <FormattedMessage
                id="xpack.observability.customThreshold.rule.alertFlyout.linkDashboards"
                defaultMessage="Link dashboard(s)"
              />
            </h6>
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
      )}
    </>
  );
};