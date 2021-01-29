/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './vega_data_inspector.scss';

import React from 'react';
import { EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { VegaInspectorAdapters } from './vega_inspector';
import { DataViewer, SignalViewer, SpecViewer } from './components';
import { InspectorViewProps } from '../../../inspector/public';

export type VegaDataInspectorProps = InspectorViewProps<VegaInspectorAdapters>;

const dataSetsLabel = i18n.translate('visTypeVega.inspector.dataSetsLabel', {
  defaultMessage: 'Data sets',
});

const signalValuesLabel = i18n.translate('visTypeVega.inspector.signalValuesLabel', {
  defaultMessage: 'Signal values',
});

const specLabel = i18n.translate('visTypeVega.inspector.specLabel', {
  defaultMessage: 'Spec',
});

const VegaDataInspector = ({ adapters }: VegaDataInspectorProps) => {
  const tabs = [
    {
      id: 'data-viewer--id',
      name: dataSetsLabel,
      content: <DataViewer vegaAdapter={adapters.vega} />,
      'data-test-subj': 'vegaDataInspectorDataViewerButton',
    },
    {
      id: 'signal-viewer--id',
      name: signalValuesLabel,
      content: <SignalViewer vegaAdapter={adapters.vega} />,
      'data-test-subj': 'vegaDataInspectorSignalViewerButton',
    },
    {
      id: 'spec-viewer--id',
      name: specLabel,
      content: (
        <SpecViewer className="vgaVegaDataInspector__specViewer" vegaAdapter={adapters.vega} />
      ),
      'data-test-subj': 'vegaDataInspectorSpecViewerButton',
    },
  ];

  return (
    <EuiTabbedContent
      className="vgaVegaDataInspector"
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
    />
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VegaDataInspector as default };
