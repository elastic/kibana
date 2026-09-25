/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useMountedState from 'react-use/lib/useMountedState';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { ActivityInvestigationResult } from './fetch_activity_investigation';
import { openActivityInvestigationChat } from './activity_investigation_chat';

const messages = {
  chatAccessError: (): string =>
    i18n.translate('discover.activityInvestigation.chatAccessErrorMessage', {
      defaultMessage:
        'Investigating requires an eligible Agent Builder license and an LLM connector.',
    }),
  openChatError: (): string =>
    i18n.translate('discover.activityInvestigation.openChatErrorMessage', {
      defaultMessage:
        'Unable to open the investigation chat. The context may be too large, or Agent Builder may be unavailable. Try again.',
    }),
} as const;

interface ActivityInvestigationChat {
  canOpenChat: boolean;
  chatOpen: boolean;
  isOpening: boolean;
  error?: string;
  clearError: () => void;
  investigate: (selectedResult: ActivityInvestigationResult) => Promise<void>;
}

/** Manages chat access and opening without using results from a superseded analysis. */
export const useActivityInvestigationChat = (
  results: readonly ActivityInvestigationResult[] | undefined
): ActivityInvestigationChat => {
  const services = useDiscoverServices();
  const { agentBuilder, core } = services;
  const latestResults = useLatest(results);
  const isMounted = useMountedState();
  const opening = useRef(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string>();
  const sidebar = useMemo(
    () => (agentBuilder ? core.chrome.sidebar.getApp('agentBuilder') : undefined),
    [agentBuilder, core]
  );
  const chatOpen$ = useMemo(() => sidebar?.isOpen$() ?? of(false), [sidebar]);
  const chatOpen = useObservable(chatOpen$, false);
  const canOpenChat =
    Boolean(agentBuilder) && core.application.capabilities.agentBuilder?.show === true;

  useEffect(() => setError(undefined), [results]);

  const investigate = async (selectedResult: ActivityInvestigationResult): Promise<void> => {
    if (!agentBuilder || !sidebar || opening.current) return;
    if (sidebar.isOpen()) {
      sidebar.close();
      return;
    }
    if (!canOpenChat || !results?.includes(selectedResult)) return;
    opening.current = true;
    setIsOpening(true);
    setError(undefined);

    try {
      const access = await agentBuilder.getAgentBuilderAccess();
      if (!isMounted() || latestResults.current !== results) return;
      if (!access.hasRequiredLicense || !access.hasLlmConnector) {
        setError(messages.chatAccessError());
        return;
      }
      openActivityInvestigationChat(selectedResult, services);
    } catch {
      if (isMounted() && latestResults.current === results) {
        setError(messages.openChatError());
      }
    } finally {
      opening.current = false;
      if (isMounted()) setIsOpening(false);
    }
  };

  return {
    canOpenChat,
    chatOpen,
    isOpening,
    error,
    clearError: () => setError(undefined),
    investigate,
  };
};
