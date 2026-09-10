/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID = 'system-inference_pii_anonymization';

/**
 * Built-in entity classes that ship with Elastic-authored regex patterns.
 * Additional classes are supported for custom patterns but have no built-in rule.
 */
export type BuiltInEntityClass = 'EMAIL' | 'IP' | 'HOST_NAME' | 'USER_NAME';

/**
 * All entity classes that support regex-based matching (i.e. not NER).
 * NER classes (PER, ORG, LOC, MISC) are not supported by workflow-driven anonymization.
 */
export type RegexEntityClass =
  | BuiltInEntityClass
  | 'URL'
  | 'CLOUD_ACCOUNT'
  | 'ENTITY_NAME'
  | 'RESOURCE_NAME'
  | 'RESOURCE_ID';

export interface InferencePiiBuiltInRule {
  entityClass: BuiltInEntityClass;
  /** Whether the built-in pattern is active. Defaults to true. */
  enabled: boolean;
}

export interface InferencePiiCustomRule {
  /** Stable opaque identifier generated at creation time (e.g. uuid v4). */
  id: string;
  /** Human-readable label shown in the UI. */
  name: string;
  entityClass: RegexEntityClass;
  /** RE2-compatible regular expression. Must be validated against the real engine at save time. */
  pattern: string;
  enabled: boolean;
}

export interface InferencePiiAnonymizationTemplateValues extends ManagedWorkflowTemplateValues {
  builtInRules: InferencePiiBuiltInRule[];
  customRules: InferencePiiCustomRule[];
  /**
   * Per-space override of xpack.inference.anonymization.failureMode.
   * When omitted the kibana.yml value is used (defaults to 'block').
   * Rendered to the YAML consts block for auditability; the inference pipeline
   * reads this value from the persisted templateValues at request time, not from
   * the workflow execution context.
   */
  failureMode?: 'block' | 'allow_unsafe';
}

/**
 * Elastic-authored regex patterns for each built-in entity class.
 * Keys match BuiltInEntityClass values.
 */
export const BUILT_IN_PATTERNS: Record<BuiltInEntityClass, string> = {
  EMAIL: String.raw`([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`,
  IP: String.raw`\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b`,
  HOST_NAME: String.raw`\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}\b`,
  USER_NAME: String.raw`\b(?:user(?:name)?|login|account)\s*[:=]\s*[a-zA-Z0-9._-]{1,64}\b`,
};

/**
 * Default template values. Reproduces the four rules originally baked into the static YAML,
 * so an existing install renders byte-equivalent rule entries after the template migration.
 */
export const INFERENCE_PII_ANONYMIZATION_DEFAULTS: InferencePiiAnonymizationTemplateValues = {
  builtInRules: [
    { entityClass: 'EMAIL', enabled: true },
    { entityClass: 'IP', enabled: true },
    { entityClass: 'HOST_NAME', enabled: true },
    { entityClass: 'USER_NAME', enabled: true },
  ],
  customRules: [],
};

/** Indents a multi-line string by `n` spaces (for YAML block rendering). */
const indent = (str: string, n: number): string => {
  const pad = ' '.repeat(n);
  return str
    .split('\n')
    .map((line) => (line.length > 0 ? `${pad}${line}` : line))
    .join('\n');
};

/** Renders a single RegExp rule entry for the ai.pii step's `rules:` list. */
const renderRule = (entityClass: string, pattern: string, enabled: boolean): string =>
  `- type: RegExp\n  enabled: ${enabled}\n  entityClass: ${entityClass}\n  pattern: '${pattern}'`;

const buildYaml = ({
  builtInRules,
  customRules,
  failureMode,
}: InferencePiiAnonymizationTemplateValues): string => {
  const activeBuiltInRules = builtInRules
    .map((rule) => renderRule(rule.entityClass, BUILT_IN_PATTERNS[rule.entityClass], rule.enabled))
    .join('\n');

  const activeCustomRules = customRules
    .map((rule) => renderRule(rule.entityClass, rule.pattern, rule.enabled))
    .join('\n');

  const allRules = [activeBuiltInRules, activeCustomRules].filter(Boolean).join('\n');

  // failureMode is rendered to the consts block so the YAML editor shows the full
  // effective configuration for this space rather than hiding it in saved-object metadata.
  const constsBlock = failureMode !== undefined ? `\nconsts:\n  failureMode: ${failureMode}\n` : '';

  // Note: \${{ is used to produce the literal ${{ in the string without triggering
  // JavaScript template-literal interpolation, which activates on ${ (single brace).
  return `name: "Protect sensitive inference data"
enabled: false
description: "Protects common identifiers around inference completion calls. Author: Elastic"
version: "1"
tags:
  - inference
  - anonymization
${constsBlock}
triggers:
  - type: inference.aroundCompletion

outputs:
  - name: content
    type: string
    required: true

steps:
  - name: anonymize_completion
    type: ai.pii
    with:
      system: "\${{ event.system }}"
      messages: "\${{ event.messages }}"
      rules:
${indent(allRules, 8)}

  - name: invoke_inference
    type: call_site.proceed
    with:
      system: "\${{ steps.anonymize_completion.output.system }}"
      messages: "\${{ steps.anonymize_completion.output.messages }}"
      tokenMap: "\${{ steps.anonymize_completion.output.tokenMap }}"

  - name: restore_completion
    type: transform.pii_restore
    with:
      rawContent: "\${{ steps.invoke_inference.output.rawContent }}"
      tokenMap: "\${{ steps.anonymize_completion.output.tokenMap }}"

  - name: emit_restored_completion
    type: workflow.output
    with:
      content: "\${{ steps.restore_completion.output.content }}"
`;
};

export const INFERENCE_PII_ANONYMIZATION_WORKFLOW = {
  id: INFERENCE_PII_ANONYMIZATION_WORKFLOW_ID,
  pluginId: 'inferenceWorkflows',
  version: 1,
  billable: false,
  yamlTemplate: buildYaml,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<InferencePiiAnonymizationTemplateValues>;
