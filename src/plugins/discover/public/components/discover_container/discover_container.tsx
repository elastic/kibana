/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ScopedHistory } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import { DiscoverMainRoute } from '../../application/main';
import type { DiscoverServices } from '../../build_services';
import type { CustomizationCallback } from '../../customizations';
import { setHeaderActionMenuMounter, setScopedHistory } from '../../kibana_services';

export interface DiscoverContainerInternalProps {
  services: DiscoverServices;
  scopedHistory: ScopedHistory;
  customize: CustomizationCallback;
  isDev: boolean;
}

export const DiscoverContainerInternal = ({
  services,
  scopedHistory,
  customize,
  isDev,
}: DiscoverContainerInternalProps) => {
  const customizationCallbacks = useMemo(() => [customize], [customize]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setScopedHistory(scopedHistory);
    setHeaderActionMenuMounter(() => {});
    setInitialized(true);
  }, [scopedHistory]);

  if (!initialized) {
    return null;
  }

  return (
    <KibanaContextProvider services={services}>
      <DiscoverMainRoute
        customizationCallbacks={customizationCallbacks}
        mode="embedded"
        isDev={isDev}
      />
    </KibanaContextProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverContainerInternal;
