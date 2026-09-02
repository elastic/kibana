/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { getRulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { useKibana } from '../use_kibana';

export interface AlertRuleLinkInfo {
  id: string;
  name: string;
  ruleUrl?: string;
}

export const useAlertRuleLink = (alertRule?: AlertRuleLinkInfo): string | undefined => {
  const { application } = useKibana().services;

  return useMemo(() => {
    if (!alertRule) {
      return undefined;
    }

    return (
      alertRule.ruleUrl ??
      application.getUrlForApp('rules', {
        path: getRulesAppDetailsRoute(alertRule.id),
      })
    );
  }, [alertRule, application]);
};
