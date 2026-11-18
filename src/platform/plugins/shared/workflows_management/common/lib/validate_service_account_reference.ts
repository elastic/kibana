/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, LineCounter } from 'yaml';
import { isScalar } from 'yaml';
import { i18n } from '@kbn/i18n';
import type { YamlValidationResult } from '@kbn/workflows-yaml';

export interface ServiceAccountSummary {
  name: string;
  enabled: boolean;
  assumable: boolean;
}

/** Lookup outcome; `unknown` (feature off, no `manage_security`, request failed) never reports. */
export type ServiceAccountLookupResult<
  TAccount extends ServiceAccountSummary = ServiceAccountSummary
> = { status: 'found'; account: TAccount } | { status: 'not_found' } | { status: 'unknown' };

export type ServiceAccountLookup = (id: string) => Promise<ServiceAccountLookupResult>;

/** Checks that `settings.run_as` names an existing, usable service account. */
export const validateServiceAccountReference = async (
  document: Document,
  lineCounter: LineCounter,
  lookup: ServiceAccountLookup
): Promise<YamlValidationResult[]> => {
  const node = document.getIn(['settings', 'run_as'], true);
  if (
    !isScalar(node) ||
    typeof node.value !== 'string' ||
    !node.range ||
    node.type === 'BLOCK_LITERAL' ||
    node.type === 'BLOCK_FOLDED'
  ) {
    return [];
  }
  const id = node.value;
  if (!id) return [];
  const start = lineCounter.linePos(node.range[0]);
  const end = lineCounter.linePos(node.range[1]);
  // A value that spans lines is not a reference, matching the service account badge.
  if (start.line !== end.line) return [];

  const result = await lookup(id);
  if (result.status === 'unknown') return [];
  if (result.status === 'found' && result.account.enabled && result.account.assumable) {
    return [];
  }

  const location = {
    id: `service-account-validation-${id}`,
    owner: 'service-account-validation' as const,
    startLineNumber: start.line,
    startColumn: start.col,
    endLineNumber: end.line,
    endColumn: end.col,
    hoverMessage: null,
  };

  if (result.status === 'not_found') {
    return [
      {
        ...location,
        ruleId: 'serviceAccountNotFound',
        severity: 'error',
        message: i18n.translate('workflows.validateServiceAccount.notFoundMessage', {
          defaultMessage: 'Service account "{id}" not found. Choose an existing service account.',
          values: { id },
        }),
      },
    ];
  }

  return [
    {
      ...location,
      ruleId: 'serviceAccountUnavailable',
      severity: 'warning',
      message: i18n.translate('workflows.validateServiceAccount.unavailableMessage', {
        defaultMessage:
          'Service account "{name}" is disabled or cannot be assumed. The workflow cannot run as this account.',
        values: { name: result.account.name },
      }),
    },
  ];
};
