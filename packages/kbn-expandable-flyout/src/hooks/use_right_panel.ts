/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useUrlState } from '@kbn/url-state';
import { EXPANDABLE_FLYOUT_URL_KEY } from '../constants';
import { FlyoutPanelProps } from '../types';

/**
 * This hook stores state in the URL
 */
export const useRightPanel = () => {
  const [rightPanelState, setRightPanelState] = useUrlState<FlyoutPanelProps>(
    EXPANDABLE_FLYOUT_URL_KEY,
    'rightPanel'
  );

  return { rightPanelState, setRightPanelState } as const;
};
