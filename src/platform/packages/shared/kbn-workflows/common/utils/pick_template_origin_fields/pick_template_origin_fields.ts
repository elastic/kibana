/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, WorkflowTemplateOrigin } from '../../../types/v1';
import { WORKFLOW_TEMPLATE_ORIGINS } from '../../constants';

export type TemplateOriginFieldsSource = Pick<
  EsWorkflowExecution,
  'templateSlug' | 'templateVersion' | 'templateOrigin'
>;

/** The Workflow Template library template a workflow was created from. */
export interface TemplateOriginFields {
  templateSlug?: string;
  templateVersion?: string;
  templateOrigin?: WorkflowTemplateOrigin;
}

/**
 * Strips null template-origin fields for workflow, execution, and telemetry payloads.
 */
export const pickTemplateOriginFields = (
  source: TemplateOriginFieldsSource | null | undefined
): TemplateOriginFields => {
  if (!source) {
    return {};
  }

  const { templateSlug, templateVersion, templateOrigin } = source;
  return {
    ...(templateSlug != null ? { templateSlug } : {}),
    ...(templateVersion != null ? { templateVersion } : {}),
    ...(templateOrigin != null ? { templateOrigin } : {}),
  };
};

const isWorkflowTemplateOrigin = (value: unknown): value is WorkflowTemplateOrigin =>
  typeof value === 'string' && (WORKFLOW_TEMPLATE_ORIGINS as readonly string[]).includes(value);

/**
 * Reads template-origin fields from an untyped `_source`, ignoring values of the wrong type.
 */
export const parseTemplateOriginFields = (
  source: Record<string, unknown> | null | undefined
): TemplateOriginFields => {
  if (!source) {
    return {};
  }

  const { templateSlug, templateVersion, templateOrigin } = source;
  return pickTemplateOriginFields({
    templateSlug: typeof templateSlug === 'string' ? templateSlug : undefined,
    templateVersion: typeof templateVersion === 'string' ? templateVersion : undefined,
    templateOrigin: isWorkflowTemplateOrigin(templateOrigin) ? templateOrigin : undefined,
  });
};
