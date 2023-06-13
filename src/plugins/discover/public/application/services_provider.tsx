/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DiscoverServices } from '../build_services';

export const ServicesContextProvider: React.FC<{ services: DiscoverServices }> = ({
  services,
  children,
}) => {
  return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
};
