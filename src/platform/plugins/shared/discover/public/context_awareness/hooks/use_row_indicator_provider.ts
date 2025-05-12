/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { RowIndicatorExtensionParams } from '../types';
import { getMergedAccessor } from '../composable_profile';

export const useRowIndicatorProvider = (rowIndicatorParams: RowIndicatorExtensionParams) => {
  const { profilesManager } = useDiscoverServices();

  return useCallback<NonNullable<UnifiedDataTableProps['getRowIndicator']>>(
    (record, euiTheme) => {
      const profiles = profilesManager.getProfiles({ record });
      const getRowIndicatorProviderAccessor = getMergedAccessor(
        profiles,
        'getRowIndicatorProvider',
        () => undefined
      );
      const getRowIndicator = getRowIndicatorProviderAccessor(rowIndicatorParams);
      return getRowIndicator?.(record, euiTheme);
    },
    [profilesManager, rowIndicatorParams]
  );
};
