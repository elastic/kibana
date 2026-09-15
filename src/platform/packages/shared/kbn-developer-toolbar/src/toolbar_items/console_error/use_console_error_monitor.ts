/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CONSOLE_ERROR_DISPLAY_DURATION } from './constants';
import type { ConsoleErrorInfo } from './console_monitor';
import { ConsoleMonitor } from './console_monitor';

export interface ConsoleErrorMonitorState {
  error: ConsoleErrorInfo | null;
  errorCount: number;
  dismiss: () => void;
}

export const useConsoleErrorMonitor = (enabled: boolean): ConsoleErrorMonitorState => {
  const [error, setError] = useState<ConsoleErrorInfo | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);
  const monitorRef = useRef<ConsoleMonitor | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    if (monitorRef.current) {
      monitorRef.current.dismiss();
      return;
    }

    setError(null);
    setErrorCount(0);
  }, []);

  useEffect(() => {
    if (!enabled) {
      dismiss();
      monitorRef.current?.destroy();
      monitorRef.current = null;
      return;
    }

    const monitor = new ConsoleMonitor();
    monitorRef.current = monitor;
    monitor.startMonitoring();

    const unsubscribe = monitor.subscribe((newError) => {
      setError(newError);

      if (newError) {
        setErrorCount((prev) => prev + 1);
      } else {
        setErrorCount(0);
      }

      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }

      if (newError) {
        dismissTimeoutRef.current = setTimeout(() => {
          monitorRef.current?.dismiss();
        }, CONSOLE_ERROR_DISPLAY_DURATION);
      } else {
        dismissTimeoutRef.current = null;
      }
    });

    return () => {
      unsubscribe();
      monitor.destroy();
      monitorRef.current = null;
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, [dismiss, enabled]);

  return { error, errorCount, dismiss };
};
