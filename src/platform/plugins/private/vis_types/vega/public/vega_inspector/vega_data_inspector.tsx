/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { EuiTabbedContent, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { InspectorViewProps } from '@kbn/inspector-plugin/public';
import { css } from '@emotion/react';
import type { VegaInspectorAdapters } from './vega_inspector';
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

const vegaDataInspectorStyles = {
  base: css({
    height: '100%',
    // TODO: EUI needs to provide props to pass down from EuiTabbedContent to tabs and content
    display: 'flex',
    flexDirection: 'column',

    "[role='tablist']": {
      flexShrink: 0,
    },

    "[role='tabpanel']": {
      flexGrow: 1,
    },
  }),
  specViewer: css({ height: '100%' }),
};

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
        announceOnMount
        title={i18n.translate('visTypeVega.inspector.errorHeading', {
          defaultMessage: `Vega didn't render successfully`,
        })}
        color="danger"
        iconType="warning"
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
      content: <SpecViewer vegaAdapter={adapters.vega} css={vegaDataInspectorStyles.specViewer} />,
      'data-test-subj': 'vegaDataInspectorSpecViewerButton',
    },
  ];

  return (
    <EuiTabbedContent
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      css={vegaDataInspectorStyles.base}
    />
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VegaDataInspector as default };
