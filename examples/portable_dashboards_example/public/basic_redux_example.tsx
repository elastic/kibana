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
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';

export const BasicReduxExample = () => {
  const [firstDashboardContainer, setFirstDashboardContainer] = useState<
    DashboardContainer | undefined
  >();
  const [secondDashboardContainer, setSecondDashboardContainer] = useState<
    DashboardContainer | undefined
  >();

  const FirstDashboardReduxWrapper = useMemo(() => {
    if (firstDashboardContainer) return firstDashboardContainer.getReduxEmbeddableTools().Wrapper;
  }, [firstDashboardContainer]);
  const SecondDashboardReduxWrapper = useMemo(() => {
    if (secondDashboardContainer) return secondDashboardContainer.getReduxEmbeddableTools().Wrapper;
  }, [secondDashboardContainer]);

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
        <p>
          Use the redux context from the dashboard container to independently set the view mode of
          two side-by-side dashboards.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h1>Dashboard #1</h1>
            </EuiTitle>
            <EuiSpacer size="m" />
            {FirstDashboardReduxWrapper && (
              <FirstDashboardReduxWrapper>
                <ButtonControls />
              </FirstDashboardReduxWrapper>
            )}
            <EuiSpacer size="m" />
            <DashboardContainerRenderer
              getCreationOptions={() => {
                return {}; // no custom creation options - just creating an empty dashboard
              }}
              onDashboardContainerLoaded={(container) => {
                setFirstDashboardContainer(container);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h1>Dashboard #2</h1>
            </EuiTitle>
            <EuiSpacer size="m" />
            {SecondDashboardReduxWrapper && (
              <SecondDashboardReduxWrapper>
                <ButtonControls />
              </SecondDashboardReduxWrapper>
            )}
            <EuiSpacer size="m" />
            <DashboardContainerRenderer
              getCreationOptions={() => {
                return {}; // no custom creation options - just creating an empty dashboard
              }}
              onDashboardContainerLoaded={(container) => {
                setSecondDashboardContainer(container);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
