/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import type { DashboardStart, SearchDashboardsResponse } from '@kbn/dashboard-plugin/public';

interface DashboardOption {
  value: string;
  label: string;
}

export function DashboardsSelector({
  dashboardStart,
  dashboardsFormData,
  onChange,
  placeholder,
}: {
  dashboardStart: DashboardStart;
  dashboardsFormData: { id: string }[];
  onChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  placeholder?: string;
}) {
  const [dashboardList, setDashboardList] = useState<DashboardOption[] | undefined>();
  const [searchValue, setSearchValue] = useState<string>('');
  const [isLoading, setLoading] = useState(false);

  const [selectedDashboards, setSelectedDashboards] = useState<
    Array<EuiComboBoxOptionOption<string>> | undefined
  >();

  const [isComboBoxOpen, setIsComboBoxOpen] = useState(false);

  const fetchDashboardTitles = useCallback(async () => {
    if (!dashboardsFormData?.length) {
      return;
    }

    try {
      const dashboardPromises = dashboardsFormData.map(async (dashboard) => {
        try {
          const findDashboardsService = await dashboardStart.findDashboardsService();

          const fetchedDashboard = await findDashboardsService.findById(dashboard.id);

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
  }, [dashboardStart, dashboardsFormData]);

  useEffect(() => {
    fetchDashboardTitles();
  }, [fetchDashboardTitles]);

  const internalOnChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    onChange(selectedOptions);
    setSelectedDashboards(selectedOptions);
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

  const getDashboardItem = (dashboard: SearchDashboardsResponse['hits'][number]) => ({
    value: dashboard.id,
    label: dashboard.attributes.title,
  });

  const loadDashboards = useCallback(async () => {
    setLoading(true);
    const findDashboardsService = await dashboardStart.findDashboardsService();

    const dashboards = await findDashboardsService.search({ size: 100, search: searchValue });

    const dashboardOptions = (dashboards.hits ?? []).map((dashboard) =>
      getDashboardItem(dashboard)
    );
    setDashboardList(dashboardOptions);
    setLoading(false);
  }, [dashboardStart, searchValue]);

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
    <EuiComboBox
      async
      isLoading={isLoading}
      fullWidth
      options={dashboardList}
      selectedOptions={selectedDashboards}
      placeholder={placeholder}
      onChange={internalOnChange}
      onFocus={handleComboBoxFocus}
      onSearchChange={onSearchChange}
      data-test-subj="dashboardsSelector"
    />
  );
}
