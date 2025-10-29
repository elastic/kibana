/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { AlertDeleteParams } from '@kbn/alerting-types';
import { createAlertDeleteSchedule } from './create_alert_delete_schedule';

export interface UseAlertDeleteScheduleParams {
  services: { http: HttpStart };
  onSuccess: (message?: string) => void;
  onError: (error: IHttpFetchError<ResponseErrorBody>) => void;
}
export const useAlertDeleteSchedule = ({
  services: { http },
  onSuccess,
  onError,
}: UseAlertDeleteScheduleParams) => {
  const mutation = useMutation({
    mutationFn: async (requestBody: AlertDeleteParams) => {
      return createAlertDeleteSchedule({
        services: { http },
        requestBody,
      });
    },
    onSuccess,
    onError,
  });

  return mutation;
};
