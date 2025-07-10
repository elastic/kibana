/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { useRef } from 'react';
import { getAlertDeleteLastRun } from './get_alert_delete_last_run';

export interface UseAlertDeleteLastRunParams {
  isEnabled: boolean;
  isOpen: boolean;
  services: { http: HttpStart };
}
export const useAlertDeleteLastRun = ({
  isEnabled,
  isOpen,
  services: { http },
}: UseAlertDeleteLastRunParams) => {
  // This ref is used to track every time the modal is opened.
  // We use it as query key + Infinity staleTime to only fetch
  // once every time the modal is opened.
  const modalOpenCountRef = useRef(0);

  if (isOpen) {
    const wasModalClosed = modalOpenCountRef.current === 0;
    if (wasModalClosed) {
      modalOpenCountRef.current = Date.now();
    }
  } else {
    modalOpenCountRef.current = 0;
  }

  const query = useQuery({
    queryKey: ['alertDeleteLastRun', modalOpenCountRef.current],
    queryFn: async () => {
      return getAlertDeleteLastRun({
        services: { http },
      });
    },
    enabled: isEnabled && isOpen,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
  return query;
};
