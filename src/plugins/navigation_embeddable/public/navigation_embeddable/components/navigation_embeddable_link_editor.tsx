/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { EuiForm, EuiButton, EuiFormRow, EuiFieldText, EuiPopoverFooter } from '@elastic/eui';
import { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';

import { useNavigationEmbeddable } from '../embeddable/navigation_embeddable';
import { NavigationEmbeddableDashboardList } from './navigation_embeddable_dashboard_list';

export const NavigationEmbeddableLinkEditor = ({
  setIsPopoverOpen,
}: {
  setIsPopoverOpen: (open: boolean) => void;
}) => {
  const navEmbeddable = useNavigationEmbeddable();

  const [selectedDashboard, setSelectedDashboard] = useState<DashboardItem | undefined>();
  const [dashboardLabel, setDashboardLabel] = useState<string>('');

  return (
    <>
      <EuiForm component="form">
        <EuiFormRow label="Dashboard">
          <NavigationEmbeddableDashboardList onDashboardSelected={setSelectedDashboard} />
        </EuiFormRow>
        <EuiFormRow label="Text">
          <EuiFieldText
            placeholder={
              selectedDashboard ? selectedDashboard.attributes.title : 'Select a dashboard'
            }
            value={dashboardLabel}
            onChange={(e) => {
              setDashboardLabel(e.target.value);
            }}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiFormRow>
      </EuiForm>
      <EuiPopoverFooter>
        <EuiButton
          size="s"
          fullWidth
          onClick={() => {
            if (selectedDashboard) {
              navEmbeddable.dispatch.addLink({
                label: dashboardLabel,
                id: selectedDashboard.id,
                title: selectedDashboard.attributes.title,
                description: selectedDashboard.attributes.description,
              });
            }
            setDashboardLabel('');
            setIsPopoverOpen(false);
          }}
        >
          Confirm
        </EuiButton>
      </EuiPopoverFooter>
    </>
  );
};
