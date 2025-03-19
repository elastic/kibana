/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
