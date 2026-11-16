/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { useIsNlToEsqlAvailable } from '@kbn/esql/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import { useDiscoverCustomizationContext } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getTabsEnabled } from '../../utils/get_tabs_enabled';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { ASK_AI_SUGGESTED_PROMPTS } from './ask_ai_prompts';

/**
 * Returns the "Ask AI" config for the classic query bar, opening the prompt in a new ES|QL tab
 */
export const useAskAi = (): SearchBarProps['askAi'] => {
  const services = useDiscoverServices();
  const customizationContext = useDiscoverCustomizationContext();
  const dispatch = useInternalStateDispatch();
  const dataView = useCurrentDataView();
  const openAskInEsqlTab = useCurrentTabAction(internalStateActions.openAskInEsqlTab);
  const isNlToEsqlAvailable = useIsNlToEsqlAvailable();
  const isAvailable =
    getTabsEnabled(services, customizationContext) &&
    isNlToEsqlAvailable &&
    services.uiSettings.get(ENABLE_ESQL);

  return useMemo(() => {
    if (!isAvailable) {
      return undefined;
    }
    return {
      suggestedPrompts: ASK_AI_SUGGESTED_PROMPTS,
      onSubmit: (prompt: string) => {
        services.trackUiMetric?.(METRIC_TYPE.CLICK, 'esql:ask_ai_prompt_submitted');
        dispatch(openAskInEsqlTab({ dataView, prompt }));
      },
    };
  }, [isAvailable, services, dispatch, openAskInEsqlTab, dataView]);
};
