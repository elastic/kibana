/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpStart, IHttpFetchError } from '@kbn/core-http-browser';
import { RuleFormData } from '../../rule_form';
import { createRule } from '../apis';

export interface UseCreateRuleProps {
  http: HttpStart;
  onSuccess?: (formData: RuleFormData) => void;
  onError?: (error: IHttpFetchError<{ message: string }>) => void;
}

export const useCreateRule = (props: UseCreateRuleProps) => {
  const { http, onSuccess, onError } = props;

  const mutationFn = ({ formData }: { formData: RuleFormData }) => {
    return createRule({
      http,
      rule: formData,
    });
  };

  return useMutation({
    mutationFn,
    mutationKey: ['useCreateRule'],
    onSuccess,
    onError,
  });
};
