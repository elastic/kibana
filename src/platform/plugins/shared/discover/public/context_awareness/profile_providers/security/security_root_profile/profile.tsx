/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent, PropsWithChildren } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { createAppWrapperAccessor } from '../accessors/create_app_wrapper_accessor';
import type { RootProfileProvider } from '../../../profiles';
import { SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import type { SecurityProfileProviderFactory } from '../types';
import { createCellRendererAccessor } from '../accessors/get_cell_renderer_accessor';
import { createDefaultSecuritySolutionAppStateGetter as createDefaultSecuritySolutionAppStateGetter } from '../accessors/get_default_app_state';
import { getAlertEventRowIndicator } from '../accessors/get_row_indicator';
import { ALERTS_INDEX_PATTERN, SECURITY_PROFILE_ID } from '../constants';

const EmptyAppWrapper: FunctionComponent<PropsWithChildren<{}>> = ({ children }) => <>{children}</>;

interface SecurityRootProfileContext {
  appWrapper?: FunctionComponent<PropsWithChildren<{}>>;
  getSecuritySolutionCellRenderer?: (
    fieldName: string
  ) => FunctionComponent<DataGridCellValueElementProps> | undefined;
}

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  RootProfileProvider<SecurityRootProfileContext>
> = (services: ProfileProviderServices) => {
  const { discoverShared } = services;
  const discoverFeaturesRegistry = discoverShared.features.registry;
  const cellRendererFeature = discoverFeaturesRegistry.getById('security-solution-cell-renderer');
  const appWrapperFeature = discoverFeaturesRegistry.getById('security-solution-app-wrapper');

  return {
    profileId: SECURITY_PROFILE_ID.root,
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
          if (!params.dataView.getIndexPattern().includes(ALERTS_INDEX_PATTERN)) {
            return entries;
          }
          ['kibana.alert.workflow_status'].forEach((fieldName) => {
            entries[fieldName] =
              context.getSecuritySolutionCellRenderer?.(fieldName) ?? entries[fieldName];
          });
          return entries;
        },
      getRowIndicatorProvider: () => () => getAlertEventRowIndicator,
      getDefaultAppState: createDefaultSecuritySolutionAppStateGetter(),
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
          getSecuritySolutionCellRenderer: getCellRenderer,
        },
      };
    },
  };
};
