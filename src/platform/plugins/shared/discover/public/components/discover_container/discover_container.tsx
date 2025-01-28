/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ScopedHistory } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { DiscoverMainRoute } from '../../application/main';
import type { DiscoverServices } from '../../build_services';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import { LoadingIndicator } from '../common/loading_indicator';

export interface DiscoverContainerInternalProps {
  /*
   *  Any override that user of this hook
   *  wants discover to use. Need to keep in mind that this
   *  param is only for overrides for the services that Discover
   *  already consumes.
   */
  overrideServices: Partial<DiscoverServices>;
  getDiscoverServices: () => DiscoverServices;
  scopedHistory: ScopedHistory;
  customizationCallbacks: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
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

const customizationContext: DiscoverCustomizationContext = { displayMode: 'embedded' };

export const DiscoverContainerInternal = ({
  overrideServices,
  scopedHistory,
  customizationCallbacks,
  getDiscoverServices,
  stateStorageContainer,
  isLoading = false,
}: DiscoverContainerInternalProps) => {
  const services = useMemo<DiscoverServices>(() => {
    return {
      ...getDiscoverServices(),
      ...overrideServices,
      getScopedHistory: <T,>() => scopedHistory as ScopedHistory<T | undefined>,
    };
  }, [getDiscoverServices, overrideServices, scopedHistory]);

  if (isLoading) {
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
      <EuiFlexItem
        css={css`
          width: 100%;
        `}
      >
        <KibanaContextProvider services={services}>
          <DiscoverMainRoute
            customizationCallbacks={customizationCallbacks}
            customizationContext={customizationContext}
            stateStorageContainer={stateStorageContainer}
          />
        </KibanaContextProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverContainerInternal;
