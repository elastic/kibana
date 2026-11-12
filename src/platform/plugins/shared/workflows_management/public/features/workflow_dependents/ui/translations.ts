/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ImpactIssue, ImpactStatus } from '../../../../common/lib/workflow_dependents/types';

export const getStatusLabel = (status: ImpactStatus): string => {
  switch (status) {
    case 'breaking':
      return i18n.translate('workflows.dependents.status.breaking', {
        defaultMessage: 'Will break',
      });
    case 'warning':
      return i18n.translate('workflows.dependents.status.warning', {
        defaultMessage: 'Might break',
      });
    case 'alreadyBroken':
      return i18n.translate('workflows.dependents.status.alreadyBroken', {
        defaultMessage: 'Already broken',
      });
    case 'unknown':
      return i18n.translate('workflows.dependents.status.unknown', {
        defaultMessage: 'Can’t check',
      });
    case 'safe':
      return i18n.translate('workflows.dependents.status.safe', { defaultMessage: 'Works' });
  }
};

/** Short status for a workflow that the open workflow runs. */
export const getCalledStatusLabel = (status: ImpactStatus): string => {
  switch (status) {
    case 'breaking':
    case 'alreadyBroken':
      return i18n.translate('workflows.dependents.status.called.breaking', {
        defaultMessage: 'Will fail',
      });
    case 'warning':
      return i18n.translate('workflows.dependents.status.called.warning', {
        defaultMessage: 'Might fail',
      });
    default:
      return getStatusLabel(status);
  }
};

/** Explains a problem in one sentence. `childName` is the workflow being run. */
export const getIssueMessage = (
  { kind, severity, field, from = '?', to = '?', detail = '' }: ImpactIssue,
  childName: string
): string => {
  // Output reads with a `| default:` filter keep working with the default value.
  const hasFallback = severity === 'warning';
  switch (kind) {
    case 'childNotFound':
      return i18n.translate('workflows.dependents.issue.childNotFound', {
        defaultMessage: 'Runs a workflow that doesn’t exist (ID "{field}")',
        values: { field },
      });
    case 'childDisabled':
      return i18n.translate('workflows.dependents.issue.childDisabled', {
        defaultMessage: '{childName} is turned off, so running it fails',
        values: { childName },
      });
    case 'childInvalid':
      return i18n.translate('workflows.dependents.issue.childInvalid', {
        defaultMessage: '{childName} has errors, so it’s saved turned off and running it fails',
        values: { childName },
      });
    case 'childFails':
      return i18n.translate('workflows.dependents.issue.childFails', {
        defaultMessage:
          '{childName} fails every time it runs: its step "{from}" runs {to}, which is broken',
        values: { childName, from, to },
      });
    case 'selfCall':
      return i18n.translate('workflows.dependents.issue.selfCall', {
        defaultMessage: 'Runs itself, which isn’t allowed, so this step always fails',
      });
    case 'missingRequiredInput':
      return i18n.translate('workflows.dependents.issue.missingRequiredInput', {
        defaultMessage: 'Doesn’t send the input "{field}", which {childName} requires',
        values: { childName, field },
      });
    case 'unknownInput':
      return severity === 'breaking'
        ? i18n.translate('workflows.dependents.issue.unknownInputRejected', {
            defaultMessage:
              'Sends the input "{field}", which {childName} doesn’t have and rejects inputs it doesn’t declare',
            values: { childName, field },
          })
        : i18n.translate('workflows.dependents.issue.unknownInput', {
            defaultMessage:
              'Sends the input "{field}", which {childName} doesn’t have, so it’s ignored',
            values: { childName, field },
          });
    case 'inputTypeMismatch':
      return i18n.translate('workflows.dependents.issue.inputTypeMismatch', {
        defaultMessage: 'Sends "{field}" as {from}, but {childName} expects {to}',
        values: { childName, field, from, to },
      });
    case 'inputRendersAsText':
      return i18n.translate('workflows.dependents.issue.inputRendersAsText', {
        defaultMessage:
          'Sends "{field}" from a text template, which always produces text, but {childName} expects {to}. The typed form, starting with $, keeps the value’s type',
        values: { childName, field, to },
      });
    case 'inputValueRejected':
      return i18n.translate('workflows.dependents.issue.inputValueRejected', {
        defaultMessage: 'Sends a value for "{field}" that {childName} rejects: {detail}',
        values: { childName, field, detail },
      });
    case 'inputTypeChanged':
      return i18n.translate('workflows.dependents.issue.inputTypeChanged', {
        defaultMessage:
          '{childName} now expects "{field}" to be {to} (was {from}). The value is computed while running, so check it yourself',
        values: { childName, field, from, to },
      });
    case 'inputAllowedValuesChanged':
      return i18n.translate('workflows.dependents.issue.inputAllowedValuesChanged', {
        defaultMessage:
          '{childName} now accepts fewer values for "{field}". The value is computed while running, so check it yourself',
        values: { childName, field },
      });
    case 'inputSchemaChanged':
      return i18n.translate('workflows.dependents.issue.inputSchemaChanged', {
        defaultMessage:
          '{childName} changed the shape or limits it accepts for "{field}". The value is computed while running, so check it yourself',
        values: { childName, field },
      });
    case 'removedOutput':
      return hasFallback
        ? i18n.translate('workflows.dependents.issue.removedOutputWithFallback', {
            defaultMessage:
              'Uses the output "{field}", which {childName} doesn’t return, so it gets its default value',
            values: { childName, field },
          })
        : i18n.translate('workflows.dependents.issue.removedOutput', {
            defaultMessage: 'Uses the output "{field}", which {childName} doesn’t return',
            values: { childName, field },
          });
    case 'unreturnedOutput':
      return hasFallback
        ? i18n.translate('workflows.dependents.issue.unreturnedOutputWithFallback', {
            defaultMessage:
              'Uses the output "{field}", which {childName} never sets in a workflow.output step, so it gets its default value',
            values: { childName, field },
          })
        : i18n.translate('workflows.dependents.issue.unreturnedOutput', {
            defaultMessage:
              'Uses the output "{field}", but {childName} never sets it in a workflow.output step, so it’s always empty',
            values: { childName, field },
          });
    case 'undeclaredOutput':
      return i18n.translate('workflows.dependents.issue.undeclaredOutput', {
        defaultMessage: 'Uses the output "{field}", but {childName} doesn’t return any outputs',
        values: { childName, field },
      });
    case 'outputNoLongerDeclared':
      return i18n.translate('workflows.dependents.issue.outputNoLongerDeclared', {
        defaultMessage:
          'Uses the output "{field}", which {childName} still returns but no longer declares, so it might stop returning it',
        values: { childName, field },
      });
    case 'outputFromLastStep':
      return i18n.translate('workflows.dependents.issue.outputFromLastStep', {
        defaultMessage:
          'Uses the output "{field}", but {childName} has no workflow.output step, so it gets the output of its last step instead, which might not include "{field}"',
        values: { childName, field },
      });
    case 'outputTypeChanged':
      return i18n.translate('workflows.dependents.issue.outputTypeChanged', {
        defaultMessage: 'Uses the output "{field}", which can now be {to} (was {from})',
        values: { field, from, to },
      });
  }
};
