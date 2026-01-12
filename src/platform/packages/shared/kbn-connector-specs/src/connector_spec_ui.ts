/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stack Connectors 2.0 - UI Metadata Extension System
 *
 * This file contains the Zod metadata extension system that enables
 * UI to be fully derived from schemas.
 *
 * WHY SEPARATE FILE: UI concerns are orthogonal to connector logic.
 * This allows the main spec to focus on connector behavior while
 * UI derivation is handled here.
 */

import { z } from '@kbn/zod/v4';

// ============================================================================
// ZOD METADATA EXTENSIONS
// ============================================================================

export enum WidgetType {
  Text = 'text',
  Password = 'password',
  Select = 'select',
  FormFieldset = 'formFieldset',
  KeyValue = 'keyValue',
}

export interface BaseMetadata {
  widget?: WidgetType | string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
  sensitive?: boolean;
  order?: number;
  hidden?: boolean;
  [x: string]: unknown;
}

export function getMeta(schema: z.ZodType): BaseMetadata {
  if (!z.globalRegistry.has(schema)) {
    return {};
  }
  return z.globalRegistry.get(schema) || {};
}

export function setMeta<T extends z.ZodType>(schema: T, meta: BaseMetadata): T {
  z.globalRegistry.add(schema, meta as Record<string, unknown>);
  return schema;
}

export function addMeta<T extends z.ZodType>(schema: T, meta: Partial<BaseMetadata>): T {
  const existing = getMeta(schema);
  z.globalRegistry.add(schema, { ...existing, ...meta } as Record<string, unknown>);
  return schema;
}
/**
 * Extended Zod type definition with UI metadata
 *
 * WHY: Zod schemas alone can derive most UI (field type, validation, labels),
 * but some UI concerns can't be inferred from types alone:
 * - Is this string a password? (needs masking)
 * - Should this string be a textarea or single-line input?
 * - What's the placeholder text? (different from label)
 * - Which section does this field belong to?
 *
 * This metadata extension allows schemas to carry UI hints while remaining
 * completely optional - fields without metadata get sensible defaults.
 */
declare module '@kbn/zod/v4' {
  interface GlobalMeta extends BaseMetadata {
    [key: string]: unknown;
  }
}

/**
 * Pre-configured schema types for common field patterns
 * WHY: Reduces boilerplate for frequently used field types
 * These use Zod's built-in .meta() to attach UI metadata
 *
 * @example
 * const apiKey = z.string().meta({ sensitive: true, placeholder: "sk-..." });
 * // Or use the helper:
 * const apiKey = UISchemas.secret("sk-...");
 */
export const UISchemas = {
  /**
   * Secret/password field - automatically masked in UI
   * USED BY: All connectors with API keys/tokens (Slack, OpenAI, Jira, etc.)
   * @example secrets: { apiKey: UISchemas.secret().describe("API Key") }
   */
  secret: (placeholder?: string) =>
    z.string().meta({
      sensitive: true,
      widget: 'password',
      placeholder,
    }),

  /**
   * Multi-line text field
   * USED BY: Webhook, Slack (message body), Teams (message text)
   * @example message: UISchemas.textarea({ rows: 5 }).describe("Message body")
   */
  textarea: (options?: { rows?: number }) =>
    z.string().meta({
      widget: 'textarea',
      widgetOptions: options,
    }),

  /**
   * JSON editor field with syntax highlighting
   * USED BY: Webhook (body), OpenAI (functions), Slack (blocks)
   * @example config: UISchemas.json().describe("Configuration object")
   */
  json: () =>
    z.string().meta({
      widget: 'json',
    }),

  /**
   * Code editor field
   * USED BY: Tines (custom scripts), TheHive (case templates)
   * @example script: UISchemas.code("javascript").describe("Custom script")
   */
  code: (language: 'javascript' | 'typescript' | 'python') =>
    z.string().meta({
      widget: 'code',
      widgetOptions: { language },
    }),

  /**
   * URL field with validation
   * USED BY: All webhook-based connectors (Webhook, Cases Webhook, Slack webhook)
   * @example webhookUrl: UISchemas.url().describe("Webhook URL")
   */
  url: (placeholder?: string) =>
    z.url().meta({
      widget: 'text',
      placeholder: placeholder ?? 'https://',
    }),
};
