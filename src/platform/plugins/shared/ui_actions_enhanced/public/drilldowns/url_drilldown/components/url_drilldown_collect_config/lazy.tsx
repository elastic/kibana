/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { UrlDrilldownOptionsProps } from './url_drilldown_options';
import type { UrlDrilldownCollectConfigProps } from './url_drilldown_collect_config';

const UrlDrilldownCollectConfigLazy = React.lazy(() =>
  import('./url_drilldown_collect_config').then(({ UrlDrilldownCollectConfig }) => ({
    default: UrlDrilldownCollectConfig,
  }))
);

export type { UrlDrilldownCollectConfigProps };

export const UrlDrilldownCollectConfig: React.FC<UrlDrilldownCollectConfigProps> = (props) => {
  return (
    <React.Suspense fallback={null}>
      <UrlDrilldownCollectConfigLazy {...props} />
    </React.Suspense>
  );
};

const UrlDrilldownOptionsComponentLazy = React.lazy(() =>
  import('./url_drilldown_options').then(({ UrlDrilldownOptionsComponent }) => ({
    default: UrlDrilldownOptionsComponent,
  }))
);

export const UrlDrilldownOptionsComponent: React.FC<UrlDrilldownOptionsProps> = (props) => {
  return (
    <React.Suspense fallback={null}>
      <UrlDrilldownOptionsComponentLazy {...props} />
    </React.Suspense>
  );
};
