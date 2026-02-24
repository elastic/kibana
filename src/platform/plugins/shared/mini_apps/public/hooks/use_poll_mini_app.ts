/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useCallback } from 'react';
import type { MiniAppsApiClient } from '../services/api';

const POLL_INTERVAL_MS = 2000;

interface UsePollMiniAppOptions {
  apiClient: MiniAppsApiClient;
  id: string | undefined;
  enabled: boolean;
  onServerUpdate: (scriptCode: string, name: string) => void;
}

/**
 * Polls a mini app saved object for changes made by server-side agent tools.
 * When the server's `updated_at` is newer than the last known value,
 * the `onServerUpdate` callback fires with the latest code and name.
 *
 * Skips updates triggered by the client itself (tracked via `markClientWrite`).
 */
export const usePollMiniApp = ({ apiClient, id, enabled, onServerUpdate }: UsePollMiniAppOptions) => {
  const lastKnownUpdatedAtRef = useRef<string | null>(null);
  const clientWriteTimestampRef = useRef<string | null>(null);
  const onServerUpdateRef = useRef(onServerUpdate);

  useEffect(() => {
    onServerUpdateRef.current = onServerUpdate;
  }, [onServerUpdate]);

  const markClientWrite = useCallback(() => {
    clientWriteTimestampRef.current = new Date().toISOString();
  }, []);

  const resetLastKnown = useCallback((updatedAt: string) => {
    lastKnownUpdatedAtRef.current = updatedAt;
  }, []);

  useEffect(() => {
    if (!enabled || !id) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const miniApp = await apiClient.get(id);
        if (cancelled) return;

        const serverUpdatedAt = miniApp.updated_at;

        if (
          lastKnownUpdatedAtRef.current &&
          serverUpdatedAt > lastKnownUpdatedAtRef.current
        ) {
          // If we recently wrote from the client, skip this update to avoid
          // overwriting the user's own change with a stale server read.
          if (
            clientWriteTimestampRef.current &&
            serverUpdatedAt <= clientWriteTimestampRef.current
          ) {
            lastKnownUpdatedAtRef.current = serverUpdatedAt;
            return;
          }

          onServerUpdateRef.current(miniApp.script_code, miniApp.name);
        }

        lastKnownUpdatedAtRef.current = serverUpdatedAt;
      } catch {
        // Silently ignore poll failures (network blips, etc.)
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [apiClient, id, enabled]);

  return { markClientWrite, resetLastKnown };
};
