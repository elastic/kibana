/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { VegaAdapter, InspectSignalsSets } from '../vega_adapter';
import { InspectorDataGrid } from './inspector_data_grid';

interface SignalViewerProps {
  vegaAdapter: VegaAdapter;
}

const initialSignalColumnWidth = 150;

const signalDataGridAriaLabel = i18n.translate('visTypeVega.inspector.signalViewer.gridAriaLabel', {
  defaultMessage: 'Signal values data grid',
});

export const SignalViewer = ({ vegaAdapter }: SignalViewerProps) => {
  const [inspectSignalsSets, setInspectSignalsSets] = useState<InspectSignalsSets>();

  useEffect(() => {
    const subscription = vegaAdapter.getSignalsSetsSubscription().subscribe((signalSets) => {
      if (signalSets) {
        setInspectSignalsSets(signalSets);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [vegaAdapter]);

  if (!inspectSignalsSets) {
    return null;
  }

  return (
    <div>
      <EuiSpacer size="s" />
      <InspectorDataGrid
        columns={inspectSignalsSets.columns.map((column, index) => {
          if (index === 0) {
            return {
              ...column,
              initialWidth: initialSignalColumnWidth,
            };
          }
          return column;
        })}
        data={inspectSignalsSets.data}
        dataGridAriaLabel={signalDataGridAriaLabel}
      />
    </div>
  );
};
