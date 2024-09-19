/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { SecurityProfileProviderFactory } from '../types';

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  RootProfileProvider
> = (services: ProfileProviderServices) => {
  const { discoverFeaturesRegistry } = services;
  const cellRendererFeature = discoverFeaturesRegistry.getById('security-solution-cell-render');
  return {
    profileId: 'security-root-profile',
    isExperimental: true,
    profile: {
      getCellRenderers: (prev) => () => ({
        ...prev(),
        'host.name': (props) => {
          if (!cellRendererFeature) return undefined;
          const CellRenderer = cellRendererFeature.getRender();
          return <CellRenderer {...props} />;
        },
      }),
    },
    resolve: (params) => {
      if (params.solutionNavId === SolutionType.Security) {
        return { isMatch: true, context: { solutionType: SolutionType.Security } };
      }
      return { isMatch: false };
    },
  };
};
