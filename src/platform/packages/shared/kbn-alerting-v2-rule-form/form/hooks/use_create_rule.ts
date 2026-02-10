/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useMutation } from '@kbn/react-query';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';

interface UseCreateRuleProps {
  http: HttpStart;
  notifications: NotificationsStart;
  onSuccess: () => void;
}

export const useCreateRule = ({ http, notifications, onSuccess }: UseCreateRuleProps) => {
  const { mutate, isLoading } = useMutation(
    (formValues: FormValues) => {
      const ruleData: CreateRuleData = {
        kind: 'signal',
        // description: formValues.description, description is not yet supported by the api, but will be added in a future PR
        name: formValues.name,
        tags: formValues.tags,
        schedule: formValues.schedule,
        enabled: formValues.enabled,
        query: formValues.query,
        timeField: formValues.timeField,
        lookbackWindow: formValues.lookbackWindow,
        groupingKey: formValues.groupingKey,
      };
      return http.post<RuleResponse>('/internal/alerting/v2/rule', {
        body: JSON.stringify(ruleData),
      });
    },
    {
      onSuccess: (data: RuleResponse) => {
        notifications.toasts.addSuccess(`Rule '${data.name}' was created successfully`);
        onSuccess();
      },
      onError: (error: Error) => {
        notifications.toasts.addDanger(`Error creating rule: ${error.message}`);
      },
    }
  );

  return { createRule: mutate, isLoading };
};
