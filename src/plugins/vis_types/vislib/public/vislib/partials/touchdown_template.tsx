/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import { EuiIcon } from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { getAnalytics, getI18n, getTheme } from '../../services';

interface Props {
  wholeBucket: boolean;
}

export const touchdownTemplate = ({ wholeBucket }: Props) => {
  return ReactDOM.renderToStaticMarkup(
    <KibanaRenderContextProvider analytics={getAnalytics()} i18n={getI18n()} theme={getTheme()}>
      <p className="visTooltip__header">
        <EuiIcon type="iInCircle" className="visTooltip__headerIcon" />
        <span className="visTooltip__headerText">
          {wholeBucket ? 'Part of this bucket' : 'This area'} may contain partial data. The selected
          time range does not fully cover it.
        </span>
      </p>
    </KibanaRenderContextProvider>
  );
};
