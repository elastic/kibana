/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL, getJoinIndices } from '@kbn/esql-utils';
import { useIsNlToEsqlAvailable } from '@kbn/esql/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import { useDiscoverCustomizationContext } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import { getTabsEnabled } from '../../utils/get_tabs_enabled';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { getAskAiSuggestedPrompts } from './ask_ai_prompts';

/**
 * Returns the "Ask AI" config for the classic query bar, generating the query and opening it in a new ES|QL tab
 */
export const useAskAi = (): SearchBarProps['askAi'] => {
  const services = useDiscoverServices();
  const customizationContext = useDiscoverCustomizationContext();
  const dispatch = useInternalStateDispatch();
  const dataView = useCurrentDataView();
  const openAskInEsqlTab = useCurrentTabAction(internalStateActions.openAskInEsqlTab);
  const isNlToEsqlAvailable = useIsNlToEsqlAvailable();
  const isEsqlMode = useIsEsqlMode();
  // Only the classic query bar offers Ask AI, so ES|QL tabs also skip the lookup index request below
  const isAvailable =
    !isEsqlMode &&
    getTabsEnabled(services, customizationContext) &&
    isNlToEsqlAvailable &&
    services.uiSettings.get(ENABLE_ESQL);

  // The joining prompt is only suggested when there is an open lookup index to join with
  const [lookupIndexName, setLookupIndexName] = useState<string>();
  useEffect(() => {
    if (!isAvailable) return;
    let cancelled = false;
    getJoinIndices('', services.http).then(
      ({ indices }) =>
        !cancelled && setLookupIndexName(indices.find((index) => !index.isClosed)?.name),
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [isAvailable, services.http]);

  return useMemo(() => {
    if (!isAvailable) {
      return undefined;
    }
    return {
      suggestedPrompts: getAskAiSuggestedPrompts(lookupIndexName),
      onSubmit: (prompt: string, signal: AbortSignal) => {
        services.trackUiMetric?.(METRIC_TYPE.CLICK, 'esql:ask_ai_prompt_submitted');
        return dispatch(openAskInEsqlTab({ dataView, prompt, signal }));
      },
    };
  }, [isAvailable, lookupIndexName, services, dispatch, openAskInEsqlTab, dataView]);
};
