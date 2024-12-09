/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent, PropsWithChildren } from 'react';
import { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { SecurityProfileProviderFactory } from '../types';
import { createCellRendererAccessor } from '../accessors/get_cell_renderer_accessor';
import { createAppWrapperAccessor } from '../accessors/create_app_wrapper_accessor';

interface SecurityRootProfileContext {
  appWrapper?: FunctionComponent<PropsWithChildren<{}>>;
  getCellRenderer?: (
    fieldName: string
  ) => FunctionComponent<DataGridCellValueElementProps> | undefined;
}

const EmptyAppWrapper: FunctionComponent<PropsWithChildren<{}>> = ({ children }) => <>{children}</>;

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  RootProfileProvider<SecurityRootProfileContext>
> = (services: ProfileProviderServices) => {
  const { discoverShared } = services;
  const discoverFeaturesRegistry = discoverShared.features.registry;
  const cellRendererFeature = discoverFeaturesRegistry.getById('security-solution-cell-renderer');
  const appWrapperFeature = discoverFeaturesRegistry.getById('security-solution-app-wrapper');

  return {
    profileId: 'security-root-profile',
    isExperimental: true,
    profile: {
      getRenderAppWrapper: (PrevWrapper, params) => {
        const AppWrapper = params.context.appWrapper ?? EmptyAppWrapper;
        return ({ children }) => (
          <PrevWrapper>
            <AppWrapper>{children}</AppWrapper>
          </PrevWrapper>
        );
      },
      getCellRenderers:
        (prev, { context }) =>
        (params) => {
          const entries = prev(params);
          ['host.name', 'user.name', 'source.ip', 'destination.ip'].forEach((fieldName) => {
            entries[fieldName] = context.getCellRenderer?.(fieldName) ?? entries[fieldName];
          });
          return entries;
        },
    },
    resolve: async (params) => {
      if (params.solutionNavId !== SolutionType.Security) {
        return {
          isMatch: false,
        };
      }

      const getAppWrapper = await createAppWrapperAccessor(appWrapperFeature);
      const getCellRenderer = await createCellRendererAccessor(cellRendererFeature);

      return {
        isMatch: true,
        context: {
          solutionType: SolutionType.Security,
          appWrapper: getAppWrapper?.(),
          getCellRenderer,
        },
      };
    },
  };
};
