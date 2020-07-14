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
import React, { useState, useCallback, useEffect } from 'react';

import { EuiComboBox, EuiFlexGroup, EuiComboBoxProps, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { VegaAdapter, InspectDataSets } from '../vega_adapter';
import { InspectorDataGrid } from './inspector_data_grid';

interface DataViewerProps {
  vegaAdapter: VegaAdapter;
}

export const DataViewer = ({ vegaAdapter }: DataViewerProps) => {
  const [inspectDataSets, setInspectDataSets] = useState<InspectDataSets[]>();
  const [selectedView, setSelectedView] = useState<InspectDataSets>();

  const onViewChange: EuiComboBoxProps<unknown>['onChange'] = useCallback(
    (selectedOptions) => {
      const newView = inspectDataSets!.find((view) => view.id === selectedOptions[0].label);

      if (newView) {
        setSelectedView(newView);
      }
    },
    [inspectDataSets]
  );

  useEffect(() => {
    const subscription = vegaAdapter.getDataSetsSubscription().subscribe((dataSets) => {
      setInspectDataSets(dataSets);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [vegaAdapter]);

  useEffect(() => {
    if (inspectDataSets) {
      setSelectedView(
        selectedView ? inspectDataSets.find(({ id }) => id === selectedView.id) : inspectDataSets[0]
      );
    }
  }, [selectedView, inspectDataSets]);

  if (!selectedView || !inspectDataSets) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiComboBox
          options={inspectDataSets.map((item: any) => ({
            label: item.id,
          }))}
          onChange={onViewChange}
          isClearable={false}
          fullWidth={true}
          singleSelection={{ asPlainText: true }}
          selectedOptions={[{ label: selectedView.id }]}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <InspectorDataGrid columns={selectedView.columns} data={selectedView.data} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
