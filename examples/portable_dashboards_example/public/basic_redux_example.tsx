/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import {
  DashboardContainer,
  DashboardContainerRenderer,
  useDashboardContainerContext,
} from '@kbn/dashboard-plugin/public';
import { EuiButtonGroup, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';

export const BasicReduxExample = () => {
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer | undefined>();

  const DashboardReduxWrapper = useMemo(() => {
    if (dashboardContainer) return dashboardContainer.getReduxEmbeddableTools().Wrapper;
  }, [dashboardContainer]);

  const ButtonControls = () => {
    const {
      useEmbeddableDispatch,
      useEmbeddableSelector: select,
      actions: { setViewMode },
    } = useDashboardContainerContext();
    const dispatch = useEmbeddableDispatch();
    const viewMode = select((state) => state.explicitInput.viewMode);

    return (
      <EuiButtonGroup
        legend="View mode"
        options={[
          {
            id: ViewMode.VIEW,
            label: 'View mode',
            value: ViewMode.VIEW,
          },
          {
            id: ViewMode.EDIT,
            label: 'Edit mode',
            value: ViewMode.EDIT,
          },
        ]}
        idSelected={viewMode}
        onChange={(id, value) => {
          dispatch(setViewMode(value));
        }}
        type="single"
      />
    );
  };

  return (
    <>
      <EuiTitle>
        <h2>Basic redux example</h2>
      </EuiTitle>
      <EuiText>
        <p>Use the redux context from the dashboard container to set the view mode.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        {DashboardReduxWrapper && (
          <DashboardReduxWrapper>
            <ButtonControls />
          </DashboardReduxWrapper>
        )}

        <EuiSpacer size="m" />

        <DashboardContainerRenderer
          getCreationOptions={() => {
            return {}; // no custom creation options - just creating an empty dashboard
          }}
          onDashboardContainerLoaded={(container) => {
            setDashboardContainer(container);
          }}
        />
      </EuiPanel>
    </>
  );
};
