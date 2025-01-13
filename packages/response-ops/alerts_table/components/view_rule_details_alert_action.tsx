/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { typedMemo } from '../utils/react';

/**
 * Alerts table row action to open the rule to which the selected alert is associated
 */
export const ViewRuleDetailsAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    resolveRulePagePath,
    tableId,
  }: AlertActionsProps<AC>) => {
    const {
      services: {
        http: {
          basePath: { prepend },
        },
      },
    } = useAlertsTableContext();
    const ruleId = (alert[ALERT_RULE_UUID]?.[0] as string) ?? null;
    const pagePath = ruleId && tableId && resolveRulePagePath?.(ruleId, tableId);
    const linkToRule = pagePath ? prepend(pagePath) : null;

    if (!linkToRule) {
      return null;
    }

    return (
      <EuiContextMenuItem
        data-test-subj="viewRuleDetails"
        key="viewRuleDetails"
        href={linkToRule}
        size="s"
      >
        {i18n.translate('xpack.triggersActionsUI.alertsTable.viewRuleDetails', {
          defaultMessage: 'View rule details',
        })}
      </EuiContextMenuItem>
    );
  }
);
