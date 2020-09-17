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
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiComboBoxProps,
  EuiFlexItem,
  EuiSpacer,
  CommonProps,
} from '@elastic/eui';
import { VegaAdapter, InspectDataSets } from '../vega_adapter';
import { InspectorDataGrid } from './inspector_data_grid';

interface DataViewerProps extends CommonProps {
  vegaAdapter: VegaAdapter;
}

const getDataGridArialabel = (view: InspectDataSets) =>
  i18n.translate('visTypeVega.inspector.dataViewer.gridAriaLabel', {
    defaultMessage: '{name} data grid',
    values: {
      name: view.id,
    },
  });

const dataSetAriaLabel = i18n.translate('visTypeVega.inspector.dataViewer.dataSetAriaLabel', {
  defaultMessage: 'Data set',
});

export const DataViewer = ({ vegaAdapter, ...rest }: DataViewerProps) => {
  const [inspectDataSets, setInspectDataSets] = useState<InspectDataSets[]>([]);
  const [selectedView, setSelectedView] = useState<InspectDataSets>();
  const [dataGridAriaLabel, setDataGridAriaLabel] = useState<string>('');

  const onViewChange: EuiComboBoxProps<unknown>['onChange'] = useCallback(
    (selectedOptions) => {
      const newView = inspectDataSets!.find((view) => view.id === selectedOptions[0].label);

      if (newView) {
        setDataGridAriaLabel(getDataGridArialabel(newView));
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
      if (!selectedView) {
        setSelectedView(inspectDataSets[0]);
      } else {
        setDataGridAriaLabel(getDataGridArialabel(selectedView));
      }
    }
  }, [selectedView, inspectDataSets]);

  if (!selectedView) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" wrap={false} responsive={false} {...rest}>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <EuiComboBox
          fullWidth
          options={inspectDataSets.map((item: any) => ({
            label: item.id,
          }))}
          aria-label={dataSetAriaLabel}
          onChange={onViewChange}
          isClearable={false}
          singleSelection={{ asPlainText: true }}
          selectedOptions={[{ label: selectedView.id }]}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <InspectorDataGrid
          columns={selectedView.columns}
          data={selectedView.data}
          dataGridAriaLabel={dataGridAriaLabel}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
