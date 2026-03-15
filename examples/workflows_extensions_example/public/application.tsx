/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { WorkflowsExtensionsExampleApp } from './components/app';

export const renderApp = (coreStart: CoreStart, { element }: AppMountParameters): (() => void) => {
  ReactDOM.render(
    coreStart.rendering.addContext(<WorkflowsExtensionsExampleApp http={coreStart.http} />),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
