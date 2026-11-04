/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  getRuleDetailsRoute,
  getTriggersActionsManagementPath,
  isSiemRuleType,
} from '@kbn/rule-data-utils';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { GetLinkedRulesResponse, LinkedRule } from '@kbn/workflows-ui';
import { useKibana } from '../../../hooks/use_kibana';

const getRuleHref = (application: ApplicationStart, { id, ruleTypeId }: LinkedRule): string =>
  isSiemRuleType(ruleTypeId)
    ? application.getUrlForApp('securitySolutionUI', {
        path: `/rules/id/${encodeURIComponent(id)}`,
      })
    : application.getUrlForApp('management', {
        path: getTriggersActionsManagementPath(getRuleDetailsRoute(encodeURIComponent(id))),
      });

interface LinkedRulesCalloutProps {
  workflowCount: number;
  data?: GetLinkedRulesResponse;
  isError: boolean;
}

export const LinkedRulesCallout = ({ workflowCount, data, isError }: LinkedRulesCalloutProps) => {
  const { application } = useKibana().services;

  if (isError) {
    return (
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={i18n.translate('workflows.linkedRules.errorTitle', {
          defaultMessage: 'Could not check for linked rules',
        })}
        text={i18n.translate('workflows.linkedRules.errorMessage', {
          defaultMessage:
            'If alerting rules run {workflowCount, plural, one {this workflow} other {these workflows}}, they will fail to run {workflowCount, plural, one {it} other {them}}.',
          values: { workflowCount },
        })}
        data-test-subj="workflowLinkedRulesError"
      />
    );
  }

  if (!data || data.total === 0) {
    return null;
  }

  const moreCount = data.total - data.rules.length;

  return (
    <KbnWarningCallout
      size="s"
      title={i18n.translate('workflows.linkedRules.title', {
        defaultMessage:
          '{total, plural, one {# alerting rule runs} other {# alerting rules run}} {workflowCount, plural, one {this workflow} other {these workflows}}',
        values: { total: data.total, workflowCount },
      })}
      text={i18n.translate('workflows.linkedRules.message', {
        defaultMessage:
          'These rules will fail to run {workflowCount, plural, one {the workflow} other {the workflows}}.',
        values: { workflowCount },
      })}
      data-test-subj="workflowLinkedRulesCallout"
    >
      <ul>
        {data.rules.map((rule) => (
          <li key={rule.id}>
            <EuiLink href={getRuleHref(application, rule)} target="_blank">
              {rule.name}
            </EuiLink>
          </li>
        ))}
      </ul>
      {moreCount > 0 && (
        <p>
          {i18n.translate('workflows.linkedRules.moreRules', {
            defaultMessage: 'And {moreCount} more.',
            values: { moreCount },
          })}
        </p>
      )}
    </KbnWarningCallout>
  );
};
