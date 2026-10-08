/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_HITL_INPUT_OPEN_FORM_LABEL } from '@kbn/workflows';

export interface HitlEmailChannelConfig {
  'connector-id': string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
}

/** `kibanaFooterLink.path` relative to `publicBaseUrl` (pathname + search). */
export function absoluteUrlToKibanaFooterPath(absoluteUrl: string, kibanaUrl: string): string {
  const target = new URL(absoluteUrl);
  const basePath = new URL(kibanaUrl).pathname.replace(/\/$/, '');
  const pathname =
    basePath.length > 0 &&
    (target.pathname === basePath || target.pathname.startsWith(`${basePath}/`))
      ? target.pathname.slice(basePath.length) || '/'
      : target.pathname;

  return `${pathname}${target.search}`;
}

function hitlInputEmailSubject(): string {
  return i18n.translate('workflowsExecutionEngine.hitlNotifications.inputRequiredTitle', {
    defaultMessage: 'Input required',
  });
}

function hitlApprovalEmailSubject(): string {
  return i18n.translate('workflowsExecutionEngine.hitlNotifications.approvalRequiredTitle', {
    defaultMessage: 'Approval required',
  });
}

function hitlEmailFooterLinkText(): string {
  return i18n.translate('workflowsExecutionEngine.hitlNotifications.viewInKibanaLinkText', {
    defaultMessage: 'View in Kibana',
  });
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
}: {
  emailConfig: HitlEmailChannelConfig;
  subject: string;
  message: string;
  footerLinkPath: string;
}): Record<string, unknown> {
  return {
    to: emailConfig.to,
    ...(emailConfig.cc?.length ? { cc: emailConfig.cc } : {}),
    ...(emailConfig.bcc?.length ? { bcc: emailConfig.bcc } : {}),
    subject,
    message,
    kibanaFooterLink: {
      path: footerLinkPath,
      text: hitlEmailFooterLinkText(),
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

  return kind === 'input' ? hitlInputEmailSubject() : hitlApprovalEmailSubject();
}
