/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';

import { initializeStateManager } from '@kbn/presentation-publishing';
import type { ControlGroupRendererProps } from './control_group_renderer';

export const usePropsApi = ({
  viewMode,
  dataLoading,
  compressed,
}: Pick<ControlGroupRendererProps, 'viewMode' | 'dataLoading' | 'compressed'>) => {
  const propsStateManager = useMemo(() => {
    return initializeStateManager(
      { viewMode: viewMode ?? 'view', dataLoading },
      { viewMode: 'view', dataLoading: false },
      {
        viewMode: 'referenceEquality',
        dataLoading: 'referenceEquality',
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const propsApi = useMemo(() => {
    return {
      ...propsStateManager.api,
      isCompressed: () => compressed ?? true,
    };
  }, [propsStateManager, compressed]);

  useEffect(() => {
    if (viewMode) propsStateManager.api.setViewMode(viewMode);
  }, [viewMode, propsStateManager]);

  useEffect(() => {
    if (dataLoading !== propsStateManager.api.dataLoading$.getValue())
      propsStateManager.api.setDataLoading(Boolean(dataLoading));
  }, [dataLoading, propsStateManager]);

  return propsApi;
};
