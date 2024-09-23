/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { ExpandableFlyoutProvider, useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { SecurityProfileProviderFactory } from '../types';

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  RootProfileProvider
> = async (services: ProfileProviderServices) => {
  const { discoverFeaturesRegistry } = services;
  const cellRendererFeature = discoverFeaturesRegistry.getById('security-solution-cell-render');
  const appWrapperFeature = discoverFeaturesRegistry.getById('security-solution-app-wrapper');
  const reduxStoreInitFeature = discoverFeaturesRegistry.getById(
    'security-solution-redux-store-init'
  );
  const store = await reduxStoreInitFeature?.init();

  const appWrapperGetter = await appWrapperFeature?.getWrapper();

  return {
    profileId: 'security-root-profile',
    isExperimental: true,
    profile: {
      getRenderDocViewerFlyout: (PrevFlyout, params) => {
        const AppWrapper = appWrapperGetter?.({ store });
        const SecurityFlyout = (props) => {
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
        if (!AppWrapper) return null;

        return (props) => (
          <ExpandableFlyoutProvider>
            <SecurityFlyout {...props} />
          </ExpandableFlyoutProvider>
        );
      },
      getRenderAppWrapper: async (PrevWrapper, params) => {
        return (
          appWrapperGetter?.({
            store,
          }) ?? PrevWrapper
        );
      },
      getCellRenderers: (prev) => () => ({
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
        return { isMatch: true, context: { solutionType: SolutionType.Security } };
      }

      return {
        isMatch: false,
      };
    },
  };
};
