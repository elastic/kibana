/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { StartDependencies } from './types';

export const mountManagementSection = (
  coreStart: CoreStart,
  startDeps: StartDependencies,
  { element }: ManagementAppMountParams
) => {
  ReactDOM.render(<div>Yo!</div>, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
