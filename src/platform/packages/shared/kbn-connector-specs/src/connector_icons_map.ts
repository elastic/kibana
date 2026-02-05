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
    lazy(() => import(/* webpackChunkName: "connectorIconVirustotal" */ './specs/virustotal/icon')),
  ],
  [
    '.alienvault-otx',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconAlienvaultOtx" */ './specs/alienvault_otx/icon')
    ),
  ],
  ['.notion', lazy(() => import(/* webpackChunkName: "connectorNotion" */ './specs/notion/icon'))],
  [
    '.brave-search',
    lazy(
      () => import(/* webpackChunkName: "connectorIconBraveSearch" */ './specs/brave_search/icon')
    ),
  ],
  [
    '.github',
    lazy(() => import(/* webpackChunkName: "connectorIconGithub" */ './specs/github/icon')),
  ],
  [
    '.jina',
    lazy(() => import(/* webpackChunkName: "connectorIconJina" */ './specs/jina/icon/jina')),
  ],
  [
    '.abuseipdb',
    lazy(() => import(/* webpackChunkName: "connectorIconAbuseipdb" */ './specs/abuseipdb/icon')),
  ],
  [
    '.greynoise',
    lazy(() => import(/* webpackChunkName: "connectorIconGreynoise" */ './specs/greynoise/icon')),
  ],
  [
    '.shodan',
    lazy(() => import(/* webpackChunkName: "connectorIconShodan" */ './specs/shodan/icon')),
  ],
  [
    '.urlvoid',
    lazy(() => import(/* webpackChunkName: "connectorIconUrlvoid" */ './specs/urlvoid/icon')),
  ],
]);
