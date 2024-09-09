/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';

import { AwaitingDashboardAPI, DashboardRenderer } from '@kbn/dashboard-plugin/public';
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
} from '@kbn/visualizations-plugin/public/legacy/embeddable/visualize_embeddable';

const INPUT_KEY = 'portableDashboard:saveExample:input';

export const DynamicByReferenceExample = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [dashboard, setdashboard] = useState<AwaitingDashboardAPI>();

  const onSave = async () => {
    if (!dashboard) return;
    setIsSaving(true);
    localStorage.setItem(INPUT_KEY, JSON.stringify(dashboard.getInput()));
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
    if (dashboard) {
      const children = dashboard.getChildIds();
      children.map((childId) => {
        dashboard.removeEmbeddable(childId);
      });
    }
  };

  const addByValue = async () => {
    if (!dashboard) return;
    dashboard.addNewEmbeddable<VisualizeInput, VisualizeOutput, VisualizeEmbeddable>(
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
  };

  const disableButtons = useMemo(() => {
    return !dashboard || isSaving;
  }, [dashboard, isSaving]);

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
                <EuiButton onClick={() => dashboard?.addFromLibrary()} isDisabled={disableButtons}>
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

        <DashboardRenderer
          getCreationOptions={async () => {
            const persistedInput = getPersistableInput();
            return {
              getInitialInput: () => ({
                ...persistedInput,
                timeRange: { from: 'now-30d', to: 'now' }, // need to set the time range for the by value vis
              }),
            };
          }}
          ref={setdashboard}
        />
      </EuiPanel>
    </>
  );
};
