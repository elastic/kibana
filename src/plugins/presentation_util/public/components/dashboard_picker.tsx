/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiComboBox } from '@elastic/eui';
import { SavedObjectsClientContract } from '../../../../core/public';
import { DashboardSavedObject } from '../../../../plugins/dashboard/public';

export interface DashboardPickerProps {
  onChange: (dashboard: { name: string; id: string } | null) => void;
  isDisabled: boolean;
  savedObjectsClient: SavedObjectsClientContract;
}

interface DashboardOption {
  label: string;
  value: string;
}

export function DashboardPicker(props: DashboardPickerProps) {
  const [dashboards, setDashboards] = useState<DashboardOption[]>([]);
  const [isLoadingDashboards, setIsLoadingDashboards] = useState(true);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardOption | null>(null);

  const { savedObjectsClient, isDisabled, onChange } = props;

  const fetchDashboards = useCallback(
    async (query) => {
      setIsLoadingDashboards(true);
      setDashboards([]);

      const { savedObjects } = await savedObjectsClient.find<DashboardSavedObject>({
        type: 'dashboard',
        search: query ? `${query}*` : '',
        searchFields: ['title'],
      });
      if (savedObjects) {
        setDashboards(savedObjects.map((d) => ({ value: d.id, label: d.attributes.title })));
      }
      setIsLoadingDashboards(false);
    },
    [savedObjectsClient]
  );

  // Initial dashboard load
  useEffect(() => {
    fetchDashboards('');
  }, [fetchDashboards]);

  return (
    <EuiComboBox
      placeholder={i18n.translate('presentationUtil.dashboardPicker.searchDashboardPlaceholder', {
        defaultMessage: 'Search dashboards...',
      })}
      singleSelection={{ asPlainText: true }}
      options={dashboards || []}
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
      onSearchChange={fetchDashboards}
      isDisabled={isDisabled}
      isLoading={isLoadingDashboards}
      compressed={true}
    />
  );
}
