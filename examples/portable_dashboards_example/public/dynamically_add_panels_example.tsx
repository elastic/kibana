/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import { DashboardContainer, LazyDashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  VisualizeEmbeddable,
  VisualizeInput,
  VisualizeOutput,
} from '@kbn/visualizations-plugin/public/embeddable/visualize_embeddable';
import { withSuspense } from '@kbn/presentation-util-plugin/public';

const INPUT_KEY = 'portableDashboard:saveExample:input';

const DashboardContainerRenderer = withSuspense(LazyDashboardContainerRenderer); // make this so we don't have two loading states - loading in the dashboard plugin instead

export const DynamicByReferenceExample = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer | undefined>();

  const onSave = async () => {
    setIsSaving(true);
    localStorage.setItem(INPUT_KEY, JSON.stringify(dashboardContainer!.getInput()));
    // simulated async save await
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const getPersistableInput = () => {
    let input = {};
    const inputAsString = localStorage.getItem(INPUT_KEY);
    if (inputAsString) {
      try {
        input = JSON.parse(inputAsString);
      } catch (e) {
        // ignore parse errors
      }
      return input;
    }
  };

  const resetPersistableInput = () => {
    localStorage.removeItem(INPUT_KEY);
    if (dashboardContainer) {
      const children = dashboardContainer.getChildIds();
      children.map((childId) => {
        dashboardContainer.removeEmbeddable(childId);
      });
    }
  };

  const addByReference = () => {
    if (dashboardContainer) {
      dashboardContainer.addFromLibrary();
    }
  };

  const addByValue = async () => {
    if (dashboardContainer) {
      dashboardContainer.addNewEmbeddable<VisualizeInput, VisualizeOutput, VisualizeEmbeddable>(
        'visualization',
        {
          title: 'Sample Markdown Vis',
          savedVis: {
            type: 'markdown',
            title: '',
            data: { aggs: [], searchSource: {} },
            params: {
              fontSize: 12,
              openLinksInNewTab: false,
              markdown: '### By Value Visualization\nThis is a sample by value panel.',
            },
          },
        }
      );
    }
  };

  const disableButtons = useMemo(() => {
    return dashboardContainer === undefined || isSaving;
  }, [dashboardContainer, isSaving]);

  return (
    <>
      <EuiTitle>
        <h2>Edit and save example</h2>
      </EuiTitle>
      <EuiText>
        <p>Customize the dashboard and persist the state to local storage.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiButton onClick={addByValue} isDisabled={disableButtons}>
                  Add visualization by value
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={addByReference} isDisabled={disableButtons}>
                  Add visualization from library
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiButton fill onClick={onSave} isLoading={isSaving} isDisabled={disableButtons}>
                  Save to local storage
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  onClick={resetPersistableInput}
                  isLoading={isSaving}
                  isDisabled={disableButtons}
                >
                  Empty dashboard and reset local storage
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <DashboardContainerRenderer
          getCreationOptions={async () => {
            const persistedInput = getPersistableInput();
            return {
              initialInput: {
                ...persistedInput,
                timeRange: { from: 'now-30d', to: 'now' }, // need to set the time range for the by value vis
              },
            };
          }}
          onDashboardContainerLoaded={(container) => {
            setDashboardContainer(container);
          }}
        />
      </EuiPanel>
    </>
  );
};
