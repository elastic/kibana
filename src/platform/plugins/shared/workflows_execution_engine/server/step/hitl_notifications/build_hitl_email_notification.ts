/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_HITL_APPROVAL_EMAIL_SUBJECT,
  DEFAULT_HITL_EMAIL_FOOTER_LINK_TEXT,
  DEFAULT_HITL_INPUT_EMAIL_SUBJECT,
  DEFAULT_HITL_INPUT_OPEN_FORM_LABEL,
} from '@kbn/workflows';

export interface HitlEmailChannelConfig {
  'connector-id': string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  message?: string;
}

/** Converts an absolute Kibana URL into `kibanaFooterLink.path` (pathname + search). */
export function absoluteUrlToKibanaFooterPath(absoluteUrl: string): string {
  const url = new URL(absoluteUrl);
  return `${url.pathname}${url.search}`;
}

/** Safe execution UI path for approval email footers (must not mutate via approve/reject). */
export function buildHitlExecutionFooterPath({
  spaceId,
  executionId,
}: {
  spaceId: string;
  executionId: string;
}): string {
  const spacePrefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
  return `${spacePrefix}/app/workflows/executions/${executionId}`;
}

export function buildDefaultHitlInputEmailMessage({
  stepMessage,
  formUrl,
}: {
  stepMessage: string;
  formUrl: string;
}): string {
  const prompt = stepMessage.length > 0 ? `${stepMessage}\n\n` : '';
  return `${prompt}[${DEFAULT_HITL_INPUT_OPEN_FORM_LABEL}](${formUrl})`;
}

export function buildDefaultHitlApprovalEmailMessage({
  message,
  approveLabel,
  rejectLabel,
  approveUrl,
  rejectUrl,
}: {
  message: string;
  approveLabel: string;
  rejectLabel: string;
  approveUrl: string;
  rejectUrl: string;
}): string {
  const prompt = message.length > 0 ? `${message}\n\n` : '';
  return `${prompt}[${approveLabel}](${approveUrl})  [${rejectLabel}](${rejectUrl})`;
}

export function buildHitlEmailConnectorInput({
  emailConfig,
  subject,
  message,
  footerLinkPath,
  footerLinkText = DEFAULT_HITL_EMAIL_FOOTER_LINK_TEXT,
}: {
  emailConfig: HitlEmailChannelConfig;
  subject: string;
  message: string;
  footerLinkPath: string;
  footerLinkText?: string;
}): Record<string, unknown> {
  return {
    to: emailConfig.to,
    ...(emailConfig.cc?.length ? { cc: emailConfig.cc } : {}),
    ...(emailConfig.bcc?.length ? { bcc: emailConfig.bcc } : {}),
    subject,
    message,
    kibanaFooterLink: {
      path: footerLinkPath,
      text: footerLinkText,
    },
  };
}

export function resolveHitlEmailSubject(
  configuredSubject: string | undefined,
  kind: 'input' | 'approval'
): string {
  if (configuredSubject != null && configuredSubject.length > 0) {
    return configuredSubject;
  }

  return kind === 'input' ? DEFAULT_HITL_INPUT_EMAIL_SUBJECT : DEFAULT_HITL_APPROVAL_EMAIL_SUBJECT;
}
