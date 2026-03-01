/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState } from 'react';
import type { ApplicationStart } from '@kbn/core/public';

interface PendingNavigation {
  url: string;
  resolve: (accepted: boolean) => void;
}

export interface NavigateConfirmationState {
  isVisible: boolean;
  url: string;
}

export interface UseNavigateConfirmationReturn {
  confirmation: NavigateConfirmationState;
  onNavigate: (url: string) => Promise<boolean>;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
}

/**
 * Hook that manages navigation requests from iframe mini apps.
 * Shows a confirmation state when a navigation is requested and resolves
 * the promise when the user accepts or rejects.
 */
export const useNavigateConfirmation = (
  application: ApplicationStart
): UseNavigateConfirmationReturn => {
  const [confirmation, setConfirmation] = useState<NavigateConfirmationState>({
    isVisible: false,
    url: '',
  });
  const pendingRef = useRef<PendingNavigation | null>(null);

  const onNavigate = useCallback((url: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      pendingRef.current = { url, resolve };
      setConfirmation({ isVisible: true, url });
    });
  }, []);

  const confirmNavigation = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setConfirmation({ isVisible: false, url: '' });

    const { url } = pending;
    try {
      if (url.startsWith('/app/') || url.startsWith('app/')) {
        const path = url.startsWith('/') ? url.slice(1) : url;
        const [, appId, ...rest] = path.split('/');
        application.navigateToApp(appId, { path: rest.length ? `/${rest.join('/')}` : undefined });
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        application.navigateToUrl(url);
      }
    } catch {
      // navigation failed silently
    }
    pending.resolve(true);
  }, [application]);

  const cancelNavigation = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setConfirmation({ isVisible: false, url: '' });
    pending?.resolve(false);
  }, []);

  return { confirmation, onNavigate, confirmNavigation, cancelNavigation };
};
