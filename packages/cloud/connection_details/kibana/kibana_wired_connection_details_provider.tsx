/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import {
  KibanaConnectionDetailsProvider,
  KibanaConnectionDetailsProviderProps,
} from './kibana_connection_details_provider';
import { getGlobalDependencies } from './global';

export type KibanaWiredConnectionDetailsProviderProps = Omit<
  KibanaConnectionDetailsProviderProps,
  'start'
>;

export const KibanaWiredConnectionDetailsProvider: React.FC<
  KibanaWiredConnectionDetailsProviderProps
> = (props) => {
  return (
    <KibanaConnectionDetailsProvider {...props} start={getGlobalDependencies().start}>
      {props.children}
    </KibanaConnectionDetailsProvider>
  );
};
