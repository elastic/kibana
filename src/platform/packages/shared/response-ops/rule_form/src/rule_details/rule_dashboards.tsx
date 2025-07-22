/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { debounce } from 'lodash';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { OptionalFieldLabel } from '../optional_field_label';
import { dashboardServiceProvider, type DashboardItem } from '../common/services/dashboard_service';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import {
  ALERT_LINK_DASHBOARDS_TITLE,
  ALERT_LINK_DASHBOARDS_PLACEHOLDER,
  ALERT_LINK_DASHBOARDS_LABEL_TOOLTIP_CONTENT,
} from '../translations';
import { LabelWithTooltip } from './label_with_tooltip';

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
  const [searchValue, setSearchValue] = useState<string>('');
  const [isLoading, setLoading] = useState(false);

  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<EuiComboBoxOptionOption<string>> | undefined
  >();

  const [isComboBoxOpen, setIsComboBoxOpen] = useState(false);

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

  useEffect(() => {
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

  // Debounced search change handler to avoid excessive API calls
  // useMemo is used instead of useCallback to avoid an eslint warning about exhaustive dependencies
  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 300),
    []
  );

  const getDashboardItem = (dashboard: DashboardItem) => ({
    value: dashboard.id,
    label: dashboard.attributes.title,
  });

  const loadDashboards = useCallback(async () => {
    if (contentManagement) {
      setLoading(true);
      const dashboards = await dashboardServiceProvider(contentManagement)
        .fetchDashboards({ limit: 100, text: `${searchValue}*` })
        .catch(() => {});
      const dashboardOptions = (dashboards ?? []).map((dashboard: DashboardItem) =>
        getDashboardItem(dashboard)
      );
      setDashboardList(dashboardOptions);
      setLoading(false);
    }
  }, [contentManagement, searchValue]);

  useEffect(() => {
    if (isComboBoxOpen) {
      loadDashboards();
    }
  }, [isComboBoxOpen, loadDashboards]);

  // Only load dashboards when ComboBox is focused/opened
  const handleComboBoxFocus = useCallback(() => {
    if (!isComboBoxOpen) {
      setIsComboBoxOpen(true);
      loadDashboards();
    }
  }, [isComboBoxOpen, loadDashboards]);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <LabelWithTooltip
                labelContent={ALERT_LINK_DASHBOARDS_TITLE}
                tooltipContent={ALERT_LINK_DASHBOARDS_LABEL_TOOLTIP_CONTENT}
              />
            }
            fullWidth
            labelAppend={OptionalFieldLabel}
          >
            <EuiComboBox
              async
              isLoading={isLoading}
              fullWidth
              options={dashboardList}
              selectedOptions={selectedDashboards}
              placeholder={ALERT_LINK_DASHBOARDS_PLACEHOLDER}
              onChange={onChange}
              onFocus={handleComboBoxFocus}
              onSearchChange={onSearchChange}
              data-test-subj="ruleLinkedDashboards"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
