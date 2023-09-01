/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ScopedHistory } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { DiscoverMainRoute } from '../../application/main';
import type { DiscoverServices } from '../../build_services';
import type { CustomizationCallback } from '../../customizations';
import { setHeaderActionMenuMounter, setScopedHistory } from '../../kibana_services';
import { LoadingIndicator } from '../common/loading_indicator';

export interface DiscoverContainerInternalProps {
  /*
   *  Any override that user of this hook
   *  wants discover to use. Need to keep in mind that this
   *  param is only for overrides for the services that Discover
   *  already consumes.
   */
  overrideServices: Partial<DiscoverServices>;
  getDiscoverServices: () => Promise<DiscoverServices>;
  scopedHistory: ScopedHistory;
  customizationCallbacks: CustomizationCallback[];
  isDev: boolean;
  isLoading?: boolean;
}

const discoverContainerWrapperCss = css`
  width: 100%;
  height: 100%;

  // override the embedded discover page height
  // to fit in the container
  .dscPage {
    height: 100%;
  }
`;

export const DiscoverContainerInternal = ({
  overrideServices,
  scopedHistory,
  customizationCallbacks,
  isDev,
  getDiscoverServices,
  isLoading = false,
}: DiscoverContainerInternalProps) => {
  const [discoverServices, setDiscoverServices] = useState<DiscoverServices | undefined>();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getDiscoverServices().then((svcs) => setDiscoverServices(svcs));
  }, [getDiscoverServices]);

  useEffect(() => {
    setScopedHistory(scopedHistory);
    setHeaderActionMenuMounter(() => {});
    setInitialized(true);
  }, [scopedHistory]);

  const services = useMemo(() => {
    if (!discoverServices) return;
    return { ...discoverServices, ...overrideServices };
  }, [discoverServices, overrideServices]);

  if (!initialized || !services || isLoading) {
    return (
      <EuiFlexGroup css={discoverContainerWrapperCss}>
        <LoadingIndicator type="spinner" />
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      css={discoverContainerWrapperCss}
      data-test-subj="discover-container-internal-wrapper"
    >
      <EuiFlexItem>
        <KibanaContextProvider services={services}>
          <DiscoverMainRoute
            customizationCallbacks={customizationCallbacks}
            mode="embedded"
            isDev={isDev}
          />
        </KibanaContextProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverContainerInternal;
