/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiComboBox } from '@elastic/eui';
import { pluginServices } from '../services';

export interface DashboardPickerProps {
  onChange: (dashboard: { name: string; id: string } | null) => void;
  isDisabled: boolean;
}

interface DashboardOption {
  label: string;
  value: string;
}

export function DashboardPicker(props: DashboardPickerProps) {
  const [dashboardOptions, setDashboardOptions] = useState<DashboardOption[]>([]);
  const [isLoadingDashboards, setIsLoadingDashboards] = useState(true);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardOption | null>(null);
  const [query, setQuery] = useState('');

  const { isDisabled, onChange } = props;
  const { dashboards } = pluginServices.getHooks();
  const { findDashboardsByTitle } = dashboards.useService();

  useEffect(() => {
    // We don't want to manipulate the React state if the component has been unmounted
    // while we wait for the saved objects to return.
    let cleanedUp = false;

    const fetchDashboards = async () => {
      setIsLoadingDashboards(true);
      setDashboardOptions([]);

      const objects = await findDashboardsByTitle(query ? `${query}*` : '');

      if (cleanedUp) {
        return;
      }

      if (objects) {
        setDashboardOptions(objects.map((d) => ({ value: d.id, label: d.attributes.title })));
      }

      setIsLoadingDashboards(false);
    };

    fetchDashboards();

    return () => {
      cleanedUp = true;
    };
  }, [findDashboardsByTitle, query]);

  return (
    <EuiComboBox
      placeholder={i18n.translate('presentationUtil.dashboardPicker.searchDashboardPlaceholder', {
        defaultMessage: 'Search dashboards...',
      })}
      singleSelection={{ asPlainText: true }}
      options={dashboardOptions || []}
      selectedOptions={!!selectedDashboard ? [selectedDashboard] : undefined}
      onChange={(e) => {
        if (e.length) {
          setSelectedDashboard({ value: e[0].value || '', label: e[0].label });
          onChange({ name: e[0].label, id: e[0].value || '' });
        } else {
          setSelectedDashboard(null);
          onChange(null);
        }
      }}
      onSearchChange={setQuery}
      isDisabled={isDisabled}
      isLoading={isLoadingDashboards}
      compressed={true}
    />
  );
}
