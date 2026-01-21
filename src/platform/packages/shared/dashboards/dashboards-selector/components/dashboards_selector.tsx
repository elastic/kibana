/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { UiActionsStart, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';

interface DashboardOption {
  value: string;
  label: string;
}

interface Dashboard {
  id: string;
  isManaged: boolean;
  title: string;
}

async function searchDashboards(
  uiActions: UiActionsStart,
  options: { search?: string; perPage?: number } = {}
): Promise<Dashboard[]> {
  const { search, perPage = 100 } = options;
  const searchAction = await uiActions.getAction('searchDashboardAction');
  return new Promise(function (resolve) {
    searchAction.execute({
      onResults(dashboards: Dashboard[]) {
        resolve(dashboards);
      },
      search: {
        search,
        per_page: perPage,
      },
      trigger: { id: 'searchDashboards' },
    } as ActionExecutionContext);
  });
}

async function getDashboardsById(uiActions: UiActionsStart, ids: string[]): Promise<Dashboard[]> {
  if (!ids.length) {
    return [];
  }
  const getDashboardsByIdsAction = await uiActions.getAction('getDashboardsByIdsAction');
  return new Promise(function (resolve) {
    getDashboardsByIdsAction.execute({
      onResults(dashboards: Dashboard[]) {
        resolve(dashboards);
      },
      ids,
      trigger: { id: 'getDashboardsById' },
    } as ActionExecutionContext);
  });
}

export function DashboardsSelector({
  uiActions,
  dashboardsFormData,
  onChange,
  placeholder,
}: {
  uiActions: UiActionsStart;
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
      const dashboardIds = dashboardsFormData.map((dashboard) => dashboard.id);
      const dashboards = await getDashboardsById(uiActions, dashboardIds);

      const validDashboards = dashboards.map((dashboard) => ({
        label: dashboard.title,
        value: dashboard.id,
      }));

      setSelectedDashboards(validDashboards);

      // if the form contains any invalid dashboard IDs, remove them from the parent form
      if (validDashboards.length !== dashboardsFormData.length) {
        onChange(validDashboards);
      }
    } catch (error) {
      // Set empty array or handle the error appropriately
      setSelectedDashboards([]);
      onChange([]);
    }
  }, [dashboardsFormData, uiActions, onChange]);

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

  const loadDashboards = useCallback(async () => {
    setLoading(true);
    try {
      const trimmedSearch = searchValue.trim();
      const dashboards = await searchDashboards(uiActions, {
        search: trimmedSearch,
        perPage: 100,
      });
      const dashboardOptions = dashboards.map((dashboard) => ({
        value: dashboard.id,
        label: dashboard.title,
      }));
      setDashboardList(dashboardOptions);
    } catch (error) {
      setDashboardList([]);
    } finally {
      setLoading(false);
    }
  }, [uiActions, searchValue]);

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
      aria-label={
        placeholder ??
        i18n.translate('dashboardsSelector.comboBox.ariaLabel', {
          defaultMessage: 'Dashboards',
        })
      }
      onChange={internalOnChange}
      onFocus={handleComboBoxFocus}
      onSearchChange={onSearchChange}
      data-test-subj="dashboardsSelector"
    />
  );
}
