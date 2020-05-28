/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect } from 'react';
import { EuiButton, EuiCopy, EuiSelect, EuiSelectOption } from '@elastic/eui';
import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainerInput,
  DashboardStart,
} from '../../../../src/plugins/dashboard/public';
import {
  EmbeddableFactoryRenderer,
  EmbeddableStart,
  ViewMode,
} from '../../../../src/plugins/embeddable/public';

// TODO: make those public on encapsulate api in dashboard?
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectDashboard } from '../../../../src/plugins/dashboard/public/saved_dashboards';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedDashboardPanel } from '../../../../src/plugins/dashboard/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { convertSavedDashboardPanelToPanelState } from '../../../../src/plugins/dashboard/public/application/lib/embeddable_saved_object_converters';

export const DashboardEmbeddableByReference = ({
  embeddableApi,
  getSavedDashboardLoader,
}: {
  getSavedDashboardLoader: DashboardStart['getSavedDashboardLoader'];
  embeddableApi: EmbeddableStart;
}) => {
  const [dashboardId, setDashboardId] = React.useState<string | undefined>();

  const input = useSavedDashboardInput(getSavedDashboardLoader, dashboardId);

  return (
    <div>
      <DashboardSelect
        getSavedDashboardLoader={getSavedDashboardLoader}
        onSelectionChange={setDashboardId}
        selectedDashboardId={dashboardId}
      />
      {input && (
        <>
          <EuiCopy textToCopy={JSON.stringify(input, null, 4)}>
            {(copy) => <EuiButton onClick={copy}>Copy input</EuiButton>}
          </EuiCopy>
          <EmbeddableFactoryRenderer
            key={input.id}
            getEmbeddableFactory={embeddableApi.getEmbeddableFactory}
            type={DASHBOARD_CONTAINER_TYPE}
            input={input}
          />
        </>
      )}
      {!input &&
        'Please pick a dashboard ⤴️. If list is empty, please make sure there are existing dashboards.'}
    </div>
  );
};

function DashboardSelect({
  getSavedDashboardLoader,
  selectedDashboardId,
  onSelectionChange,
}: {
  getSavedDashboardLoader: DashboardStart['getSavedDashboardLoader'];
  selectedDashboardId?: string;
  onSelectionChange: (selectedDashboardId: string) => void;
}) {
  const [options, setOptions] = React.useState<EuiSelectOption[]>([]);

  useEffect(() => {
    (async () => {
      const dashboards = await getSavedDashboardLoader().findAll();
      // TODO: this is not typed as dashboard saved objects
      const _options = dashboards.hits.map((d) => ({
        value: d.id as string,
        text: d.title as string,
      }));
      setOptions(_options);
      if (!selectedDashboardId && _options.length > 0) {
        onSelectionChange(_options[0].value);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiSelect
      options={options}
      value={selectedDashboardId}
      onChange={(e) => onSelectionChange(e.target.value)}
      aria-label="Pick a dashboard"
    />
  );
}

function useSavedDashboardInput(
  getSavedDashboardLoader: DashboardStart['getSavedDashboardLoader'],
  dashboardId?: string
): DashboardContainerInput | undefined {
  const [input, setInput] = React.useState<DashboardContainerInput | undefined>();

  useEffect(() => {
    if (dashboardId) {
      (async () => {
        const dashboard = (await getSavedDashboardLoader().get(
          dashboardId
        )) as SavedObjectDashboard;
        const panels = JSON.parse(dashboard.panelsJSON) ?? [];
        const embeddablesMap: DashboardContainerInput['panels'] = {};
        panels.forEach((panel: SavedDashboardPanel) => {
          embeddablesMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
        });
        setInput({
          id: dashboardId,
          panels: embeddablesMap,
          // TODO: do we need all of this or can we mark those optional?
          viewMode: ViewMode.VIEW,
          filters: [],
          timeRange: { to: 'now', from: 'now-15m' },
          useMargins: false,
          title: 'test',
          query: { query: '', language: 'lucene' },
          isFullScreenMode: false,
          refreshConfig: { pause: true, value: 15 },
        });
      })();
    } else {
      setInput(undefined);
    }
  }, [dashboardId, getSavedDashboardLoader]);

  return input;
}
