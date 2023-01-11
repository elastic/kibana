/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import type { FC } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useApp } from './context';

export const App: FC = () => {
  const { rpc } = useApp();

  useEffect(() => {
    const load = async () => {
      const res = await rpc.get({ type: 'dashboard', id: '123' });
      console.log('Result', res);
    };

    load();
  }, [rpc]);

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header
        pageTitle="Content management POC"
        description=""
        rightSideItems={[<button>Todo</button>]}
      />
      <KibanaPageTemplate.Section>
        {/* Any children passed to the component */}
        <div>Content will come here</div>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
