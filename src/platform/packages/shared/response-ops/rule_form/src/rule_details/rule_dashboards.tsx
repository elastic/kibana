/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { OptionalFieldLabel } from '../optional_field_label';
import { dashboardServiceProvider, type DashboardItem } from '../common/services/dashboard_service';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import { ALERT_LINK_DASHBOARDS_TITLE, ALERT_LINK_DASHBOARDS_PLACEHOLDER } from '../translations';

export interface Props {
  contentManagement: ContentManagementPublicStart;
}

interface DashboardOption {
  value: string;
  label: string;
}

export const RuleDashboards = ({ contentManagement }: Props) => {
  const { formData } = useRuleFormState();
  const dispatch = useRuleFormDispatch();
  const dashboardsFormData = useMemo(
    () => formData.artifacts?.dashboards ?? [],
    [formData.artifacts]
  );

  const [dashboardList, setDashboardList] = useState<DashboardOption[] | undefined>();

  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<EuiComboBoxOptionOption<string>> | undefined
  >();

  const fetchDashboardTitles = useCallback(async () => {
    if (!dashboardsFormData?.length || !contentManagement) {
      return;
    }

    try {
      const dashboardPromises = dashboardsFormData.map(async (dashboard) => {
        try {
          const fetchedDashboard = await dashboardServiceProvider(contentManagement).fetchDashboard(
            dashboard.id
          );

          // Only return the dashboard if it exists, fetch was successful, and has a title
          if (
            fetchedDashboard &&
            fetchedDashboard.status === 'success' &&
            fetchedDashboard.attributes?.title
          ) {
            return {
              label: fetchedDashboard.attributes.title,
              value: dashboard.id,
            };
          }
          // Return null if dashboard doesn't have required data
          return null;
        } catch (dashboardError) {
          /**
           * Swallow the error that is thrown, since this just means the selected dashboard was deleted
           * Return null when dashboard fetch fails
           */
          return null;
        }
      });

      const results = await Promise.all(dashboardPromises);

      // Filter out null results and cast to the expected type
      const validDashboards = results.filter(Boolean) as Array<EuiComboBoxOptionOption<string>>;

      setSelectedDashboards(validDashboards);
    } catch (error) {
      // Set empty array or handle the error appropriately
      setSelectedDashboards([]);
    }
  }, [dashboardsFormData, contentManagement]);

  useMemo(() => {
    fetchDashboardTitles();
  }, [fetchDashboardTitles]);

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
    if (contentManagement) {
      const dashboards = await dashboardServiceProvider(contentManagement)
        .fetchDashboards()
        .catch(() => {});
      const dashboardOptions = (dashboards ?? []).map((dashboard: DashboardItem) =>
        getDashboardItem(dashboard)
      );
      setDashboardList(dashboardOptions);
    }
  }, [contentManagement]);

  useMemo(() => {
    loadDashboards();
  }, [loadDashboards]);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={ALERT_LINK_DASHBOARDS_TITLE}
            fullWidth
            labelAppend={OptionalFieldLabel}
          >
            <EuiComboBox
              fullWidth
              options={dashboardList}
              selectedOptions={selectedDashboards}
              placeholder={ALERT_LINK_DASHBOARDS_PLACEHOLDER}
              onChange={onChange}
              data-test-subj="ruleLinkedDashboards"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
