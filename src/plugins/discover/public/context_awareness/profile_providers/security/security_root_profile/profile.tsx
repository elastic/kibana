/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { HostDetailsButton, DiscoverFlyout } from '@kbn/securitysolution-common';
import React, { PropsWithChildren, useCallback } from 'react';
import { ExpandableFlyoutProvider, useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { SecurityProfileProviderFactory } from '../types';

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  RootProfileProvider
> = (services: ProfileProviderServices) => ({
  profileId: 'security-root-profile',
  profile: {
    getCellRenderers: (prev) => () => ({
      ...prev(),
      'host.name': (props) => {
        const value = getFieldValue(props.row, 'host.name');

        return (
          <ExpandableFlyoutProvider>
            <HostDetailsWithFlyout>{value}</HostDetailsWithFlyout>{' '}
          </ExpandableFlyoutProvider>
        );
      },
    }),
  },
  resolve: (params) => {
    if (params.solutionNavId === SolutionType.Security) {
      return { isMatch: true, context: { solutionType: SolutionType.Default } };
    }

    return { isMatch: false };
  },
});

const HostDetailsWithFlyout = ({ children }: PropsWithChildren<{ value?: string }>) => {
  const { closeFlyout, openFlyout } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    openFlyout({
      right: {
        id: 'host',
        params: {
          contextID: 'host',
          hostName: '',
          scopeId: '',
          isDraggable: false,
        },
      },
    });
  }, [openFlyout]);

  return (
    <>
      <DiscoverFlyout /> <HostDetailsButton onClick={onClick}>{children}</HostDetailsButton>
    </>
  );
};

const getFieldValue = (record: DataTableRecord, field: string) => {
  const value = record.flattened[field];
  return Array.isArray(value) ? value[0] : value;
};
