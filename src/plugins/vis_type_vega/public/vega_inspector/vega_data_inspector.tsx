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
