/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DiscoverGridFlyoutProps } from '../../../../components/discover_grid_flyout';
import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { SecurityProfileProviderFactory } from '../types';

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  RootProfileProvider<{
    solutionType: SolutionType.Security;
    store: unknown;
    appWrapper: React.FC;
  }>
> = async (services: ProfileProviderServices) => {
  const { discoverFeaturesRegistry } = services;
  const cellRendererFeature = discoverFeaturesRegistry.getById('security-solution-cell-render');
  const appWrapperFeature = discoverFeaturesRegistry.getById('security-solution-app-wrapper');
  const reduxStoreInitFeature = discoverFeaturesRegistry.getById(
    'security-solution-redux-store-init'
  );

  return {
    profileId: 'security-root-profile',
    isExperimental: true,
    profile: {
      getRenderDocViewerFlyout: (PrevFlyout, params) => {
        const SecurityFlyout = (props: DiscoverGridFlyoutProps) => {
          const { closeFlyout, openFlyout } = useExpandableFlyoutApi();
          useEffect(() => {
            if (!props.hit.raw._id) return;
            openFlyout({
              right: {
                id: 'document-details-right',
                params: {
                  id: props.hit.raw._id,
                  indexName: props.hit.raw._index ?? '',
                  scopeId: 'security',
                },
              },
            });
          }, [openFlyout, props.hit.raw._id, props.hit.raw._index]);

          return null;
        };
        return (props) => <SecurityFlyout {...props} />;
      },
      getRenderAppWrapper: (PrevWrapper, params) => params.context.appWrapper,
      getCellRenderers: (prev, params) => () => ({
        ...prev(),
        'host.name': (props) => {
          if (!cellRendererFeature) return undefined;
          const CellRenderer = cellRendererFeature.getRender();
          return <CellRenderer {...props} />;
        },
        'user.name': (props) => {
          if (!cellRendererFeature) return undefined;
          const CellRenderer = cellRendererFeature.getRender();
          return <CellRenderer {...props} />;
        },
      }),
    },
    resolve: async (params) => {
      if (params.solutionNavId === SolutionType.Security) {
        const store = await reduxStoreInitFeature?.init();
        const appWrapperGetter = await appWrapperFeature?.getWrapper();

        return {
          isMatch: true,
          context: {
            solutionType: SolutionType.Security,
            store,
            appWrapper: appWrapperGetter?.({ store }),
          },
        };
      }

      return {
        isMatch: false,
      };
    },
  };
};
