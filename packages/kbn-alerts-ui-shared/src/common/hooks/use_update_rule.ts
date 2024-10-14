/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpStart, IHttpFetchError } from '@kbn/core-http-browser';
import { updateRule, UpdateRuleBody } from '../apis/update_rule';

export interface UseUpdateRuleProps {
  http: HttpStart;
  onSuccess?: (formData: UpdateRuleBody) => void;
  onError?: (error: IHttpFetchError<{ message: string }>) => void;
}

export const useUpdateRule = (props: UseUpdateRuleProps) => {
  const { http, onSuccess, onError } = props;

  const mutationFn = ({ id, formData }: { id: string; formData: UpdateRuleBody }) => {
    return updateRule({
      id,
      http,
      rule: formData,
    });
  };

  return useMutation({
    mutationKey: ['useUpdateRule'],
    mutationFn,
    onSuccess,
    onError,
  });
};
