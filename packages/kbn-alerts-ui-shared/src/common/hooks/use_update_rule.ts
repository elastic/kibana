/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMutation } from '@tanstack/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { RuleFormData } from '../../rule_form';
import { updateRule } from '../apis';

export interface UseUpdateRuleProps {
  http: HttpStart;
  onSuccess?: (formData: RuleFormData) => void;
  onError?: (error: unknown) => void;
}

export const useUpdateRule = (props: UseUpdateRuleProps) => {
  const { http, onSuccess, onError } = props;

  const mutationFn = ({ id, formData }: { id: string; formData: RuleFormData }) => {
    return updateRule({
      id,
      http,
      rule: formData,
    });
  };

  return useMutation({
    mutationFn,
    mutationKey: ['useUpdateRule'],
    onSuccess,
    onError,
  });
};
