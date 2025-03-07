/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerting-types';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

export const useAlertMutedState = (alert?: Alert) => {
  const { mutedAlerts } = useAlertsTableContext();
  const alertInstanceId = alert && (alert[ALERT_INSTANCE_ID]?.[0] as string);
  const ruleId = alert && (alert[ALERT_RULE_UUID]?.[0] as string);
  return useMemo(() => {
    const rule = ruleId ? mutedAlerts?.[ruleId] ?? [] : [];
    return {
      isMuted: alertInstanceId ? rule?.includes(alertInstanceId) : null,
      ruleId,
      rule,
      alertInstanceId,
    };
  }, [alertInstanceId, mutedAlerts, ruleId]);
};
