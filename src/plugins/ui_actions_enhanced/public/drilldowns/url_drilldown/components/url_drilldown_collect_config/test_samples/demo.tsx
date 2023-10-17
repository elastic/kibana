/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { UrlDrilldownConfig } from '../../../types';
import { UrlDrilldownCollectConfig } from '../url_drilldown_collect_config';

export const Demo = () => {
  const [config, onConfig] = React.useState<UrlDrilldownConfig>({
    openInNewTab: false,
    encodeUrl: true,
    url: { template: '' },
  });

  return (
    <>
      <UrlDrilldownCollectConfig
        config={config}
        onConfig={onConfig}
        exampleUrl="https://www.example.com"
        variables={[
          {
            label: 'event.key',
          },
          {
            label: 'event.value',
          },
        ]}
      />
      {JSON.stringify(config)}
    </>
  );
};
