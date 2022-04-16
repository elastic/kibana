/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import { EuiIcon } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { getTheme } from '../../services';

interface Props {
  wholeBucket: boolean;
}

export const touchdownTemplate = ({ wholeBucket }: Props) => {
  return ReactDOM.renderToStaticMarkup(
    <KibanaThemeProvider theme$={getTheme().theme$}>
      <p className="visTooltip__header">
        <EuiIcon type="iInCircle" className="visTooltip__headerIcon" />
        <span className="visTooltip__headerText">
          {wholeBucket ? 'Part of this bucket' : 'This area'} may contain partial data. The selected
          time range does not fully cover it.
        </span>
      </p>
    </KibanaThemeProvider>
  );
};
