/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazy } from 'react';
import type { ConnectorIconProps } from './types';

/**
 * Icon exports for connector specs. Add new icon exports here as they are created.
 * Convention:
 * - key should match the connector.id with the leading dot (e.g., '.virustotal')
 * - value should be a lazy component that imports the icon
 * - chunk name should match the connector.id (e.g., 'connectorIconVirustotal')
 */

export const ConnectorIconsMap: Map<
  string,
  React.LazyExoticComponent<React.ComponentType<ConnectorIconProps>>
> = new Map([
  [
    '.virustotal',
    lazy(() => import(/* webpackChunkName: "connectorIconVirustotal" */ './icons/virustotal')),
  ],
  [
    '.alienvault-otx',
    lazy(
      () => import(/* webpackChunkName: "connectorIconAlienvaultOtx" */ './icons/alienvault_otx')
    ),
  ],
  ['.notion', lazy(() => import(/* webpackChunkName: "connectorNotion" */ './icons/notion'))],
]);
