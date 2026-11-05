/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import type { HttpStart, ToastsStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { ProfileType } from '../../common';
import { fetchProfilerStatus, startProfile, stopProfile } from '../lib/api';
import { downloadFile } from '../lib/download_file';

export interface ProfileControlProps {
  readonly type: ProfileType;
  readonly http: HttpStart;
  readonly toasts: ToastsStart;
}

interface ProfileLabels {
  readonly tooltip: string;
  readonly start: string;
  readonly stop: string;
  readonly startError: string;
  readonly stopError: string;
}

function getProfileLabels(type: ProfileType): ProfileLabels {
  if (type === 'cpu') {
    return {
      tooltip: i18n.translate('developerToolbarProfilers.cpu.tooltip', {
        defaultMessage:
          'Samples where the Kibana server spends CPU time. When stopped, the profile is saved as a .cpuprofile file to open in Chrome DevTools.',
      }),
      start: i18n.translate('developerToolbarProfilers.cpu.startButton', {
        defaultMessage: 'CPU profile',
      }),
      stop: i18n.translate('developerToolbarProfilers.cpu.stopButton', {
        defaultMessage: 'Stop CPU profile',
      }),
      startError: i18n.translate('developerToolbarProfilers.cpu.startError', {
        defaultMessage: 'Unable to start the CPU profile',
      }),
      stopError: i18n.translate('developerToolbarProfilers.cpu.stopError', {
        defaultMessage: 'Unable to stop the CPU profile',
      }),
    };
  }

  return {
    tooltip: i18n.translate('developerToolbarProfilers.memory.tooltip', {
      defaultMessage:
        'Samples where the Kibana server allocates heap memory. When stopped, the profile is saved as a .heapprofile file to open in Chrome DevTools.',
    }),
    start: i18n.translate('developerToolbarProfilers.memory.startButton', {
      defaultMessage: 'Memory profile',
    }),
    stop: i18n.translate('developerToolbarProfilers.memory.stopButton', {
      defaultMessage: 'Stop memory profile',
    }),
    startError: i18n.translate('developerToolbarProfilers.memory.startError', {
      defaultMessage: 'Unable to start the memory profile',
    }),
    stopError: i18n.translate('developerToolbarProfilers.memory.stopError', {
      defaultMessage: 'Unable to stop the memory profile',
    }),
  };
}

function toError(error: unknown): Error {
  if (isHttpFetchError(error)) {
    const { body } = error;
    if (typeof body === 'object' && body && 'message' in body && typeof body.message === 'string') {
      return new Error(body.message);
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** A developer toolbar button that starts a server profile, then stops it and downloads the profile file. */
export function ProfileControl({ type, http, toasts }: ProfileControlProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const labels = getProfileLabels(type);

  // A profile may already be running, e.g. after a page reload.
  const syncWithServer = useCallback(async () => {
    try {
      const status = await fetchProfilerStatus(http);
      setIsRunning(status[type].isRunning);
    } catch {
      // Requests made by clicking the button report their own failures.
    }
  }, [http, type]);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  async function onClick() {
    setIsBusy(true);
    try {
      if (isRunning) {
        const file = await stopProfile(http, type);
        setIsRunning(false);
        downloadFile(file);
      } else {
        await startProfile(http, type);
        setIsRunning(true);
      }
    } catch (error) {
      toasts.addError(toError(error), { title: isRunning ? labels.stopError : labels.startError });
      await syncWithServer();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <EuiToolTip content={labels.tooltip}>
      <EuiButtonEmpty
        size="xs"
        color={isRunning ? 'danger' : 'text'}
        iconType={isRunning ? 'stop' : 'play'}
        isLoading={isBusy}
        onClick={onClick}
        data-test-subj={`serverProfilers-${type}-button`}
      >
        {isRunning ? labels.stop : labels.start}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
}
