/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { SecuritySolutionAppWrapperFeature } from '@kbn/discover-shared-plugin/public/services/discover_features';
import { CustomCellRenderer } from '@kbn/unified-data-table';
import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { SecurityProfileProviderFactory } from '../types';
import { createCellRendererAccessor } from '../accessors/get_cell_renderer_accessor';

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  Promise<RootProfileProvider>
> = async (services: ProfileProviderServices) => {
  const { discoverFeaturesRegistry } = services;
  const cellRendererFeature = discoverFeaturesRegistry.getById('security-solution-cell-render');
  const appWrapperFeature = discoverFeaturesRegistry.getById('security-solution-app-wrapper');
  const reduxStoreInitFeature = discoverFeaturesRegistry.getById(
    'security-solution-redux-store-init'
  );

  const getCellRenderer = createCellRendererAccessor(cellRendererFeature);

  let store: unknown;
  let appWrapperGetter:
    | Awaited<ReturnType<SecuritySolutionAppWrapperFeature['getWrapper']>>
    | undefined;

  return {
    profileId: 'security-root-profile',
    isExperimental: true,
    profile: {
      getRenderAppWrapper: (PrevWrapper) =>
        React.memo(({ children }) => {
          const AppWrapper = useMemo(() => appWrapperGetter?.({ store }) ?? PrevWrapper, []);
          return <AppWrapper>{children}</AppWrapper>;
        }),
      getCellRenderers: (prev) => (params) => {
        const entries = prev(params);
        const customCellRenderers = [
          'host.name',
          'user.name',
          'source.ip',
          'destination.ip',
        ].reduce<CustomCellRenderer>((acc, fieldName) => {
          if (!entries[fieldName]) return acc;
          acc[fieldName] = getCellRenderer(fieldName) ?? entries[fieldName];
          return acc;
        }, {});
        return {
          ...entries,
          ...customCellRenderers,
        };
      },
    },
    resolve: async (params) => {
      if (params.solutionNavId !== SolutionType.Security) {
        return {
          isMatch: false,
        };
      }

      store = await reduxStoreInitFeature?.get();
      appWrapperGetter = await appWrapperFeature?.getWrapper();

      return {
        isMatch: true,
        context: {
          solutionType: SolutionType.Security,
        },
      };
    },
  };
};
