/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './vega_data_inspector.scss';

import React, { useState, useEffect } from 'react';
import { EuiTabbedContent, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InspectorViewProps } from '@kbn/inspector-plugin/public';
import { VegaInspectorAdapters } from './vega_inspector';
import { DataViewer, SignalViewer, SpecViewer } from './components';

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
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const subscription = adapters.vega.getErrorObservable().subscribe((data) => {
      setError(data);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [adapters.vega]);

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('visTypeVega.inspector.errorHeading', {
          defaultMessage: `Vega didn't render successfully`,
        })}
        color="danger"
        iconType="alert"
      >
        <p>{error}</p>
      </EuiCallOut>
    );
  }

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
