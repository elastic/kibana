/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import { DashboardContainer, DashboardContainerRenderer } from '@kbn/dashboard-plugin/public';
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

const INPUT_KEY = 'portableDashboard:saveExample:input';

export const DynamicByReferenceExample = ({ dataView }: { dataView: DataView }) => {
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

  const resetPersistableInput = async () => {
    setIsSaving(true);
    localStorage.removeItem(INPUT_KEY);
    if (dashboardContainer) {
      const children = dashboardContainer.getChildIds();
      children.map((childId) => {
        dashboardContainer.removeEmbeddable(childId);
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
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
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={addByValue} isDisabled={disableButtons}>
                  Add visualization by value
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={addByReference} isDisabled={disableButtons}>
                  Add visualization from library
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={onSave} isLoading={isSaving} isDisabled={disableButtons}>
                  Save to local storage
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
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
          getCreationOptions={() => {
            const persistedInput = getPersistableInput();
            return {
              initialInput: {
                ...persistedInput,
                timeRange: { from: 'now-30d', to: 'now' }, // need to set the time range
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
