/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HitlEmailChannelSchema } from '@kbn/workflows';
import { DEFAULT_HITL_INPUT_OPEN_FORM_LABEL } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { buildWorkflowExecutionAppPath } from '../../utils/get_kibana_url';

export type HitlEmailChannelConfig = z.infer<typeof HitlEmailChannelSchema>;

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

/** Safe execution UI path for approval email footers (must not mutate via approve/reject). */
export function buildHitlExecutionFooterPath({
  spaceId,
  workflowId,
  executionId,
}: {
  spaceId: string;
  workflowId: string;
  executionId: string;
}): string {
  return buildWorkflowExecutionAppPath(spaceId, workflowId, executionId);
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

/** Fails delivery when a configured email channel has no recipients left after rendering. */
export function assertRenderedHitlEmailRecipients(to: string[]): void {
  if (to.length === 0) {
    throw new Error('HITL email "to" rendered to an empty list');
  }
}

/** Renders recipient templates and drops entries that render blank. */
export function renderHitlEmailAddresses(
  addresses: string[] | undefined,
  renderTemplate: (template: string) => string
): string[] {
  return (addresses ?? [])
    .map((address) => renderTemplate(address).trim())
    .filter((address) => address.length > 0);
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
      text: 'View in Kibana',
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

  return kind === 'input' ? 'Input required' : 'Approval required';
}
