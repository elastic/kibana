/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UrlDrilldownConfig } from '../../../types';
import { UrlDrilldownCollectConfig } from '../url_drilldown_collect_config';

export const Demo = () => {
  const [config, onConfig] = React.useState<UrlDrilldownConfig>({
    openInNewTab: false,
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
