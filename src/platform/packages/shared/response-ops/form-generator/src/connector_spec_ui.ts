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
// ZOD UI METADATA REGISTRY (Using Zod 4's Registry API)
// ============================================================================

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
 *
 * IMPLEMENTATION: Uses Zod 4's custom registry API with .register() method
 * which is more efficient than .meta() as it returns the original schema.
 */

/**
 * UI metadata that can be attached to any Zod schema via the UI registry
 */
export interface UIMetadata {
  /**
   * Mark field as sensitive (password/token/secret)
   * WHY: Can't infer from z.string() whether value should be masked
   * EFFECT: Renders as password input, masked in logs/errors
   * @example z.string().register(uiRegistry, { sensitive: true })
   */
  sensitive?: boolean;

  /**
   * Override default widget for this field type
   * WHY: Same Zod type can need different UI widgets
   * - z.string() could be: text input, textarea, JSON editor, code editor
   * - z.record() could be: key-value editor, JSON editor
   * @example z.string().register(uiRegistry, { widget: "textarea" })
   * @example z.string().register(uiRegistry, { widget: "json" })
   */
  widget?:
    | 'text' // Single-line text input (default for z.string())
    | 'textarea' // Multi-line text input
    | 'password' // Masked password input (auto-applied if sensitive: true)
    | 'json' // JSON editor with syntax highlighting and validation
    | 'code' // Code editor (specify language in widgetOptions)
    | 'keyValue' // Key-value pair editor (for z.record())
    | 'number' // Number input with increment/decrement (default for z.number())
    | 'select' // Dropdown (auto-applied for z.enum() and when optionsFrom is set)
    | 'multiSelect' // Multi-select dropdown (for z.array(z.enum()))
    | 'toggle' // Toggle switch (default for z.boolean())
    | 'date' // Date picker
    | 'dateTime' // Date and time picker
    | 'fileUpload' // File upload input
    | 'formFieldset';

  /**
   * Widget-specific configuration options
   * WHY: Different widgets need different configuration
   * @example { language: "javascript" } for code widget
   * @example { rows: 10 } for textarea widget
   */
  widgetOptions?: {
    language?: 'javascript' | 'typescript' | 'json' | 'yaml' | 'python';
    rows?: number;
    cols?: number;
    [key: string]: unknown;
  };

  label?: string;

  /**
   * Placeholder text shown in empty input
   * WHY: Placeholder provides example/hint, different from label
   * Label = "API Token", Placeholder = "xoxb-1234-5678-..."
   * @example z.string().register(uiRegistry, { placeholder: "https://api.example.com" })
   */
  placeholder?: string;

  /**
   * Section/group this field belongs to
   * WHY: Long forms need grouping for usability
   * Fields with same section value are grouped together in UI
   * @example z.string().register(uiRegistry, { section: "Authentication" })
   */
  section?: string;

  /**
   * Explicit display order (lower = shown first)
   * WHY: Object property order in JS/TS isn't always guaranteed
   * Without this, fields might render in any order
   * @example z.string().register(uiRegistry, { order: 1 })
   */
  order?: number;

  /**
   * Conditional visibility based on another field's value
   * WHY: Some fields only make sense in certain contexts
   * Example: "host" field only relevant when service = "custom"
   * @example z.string().register(uiRegistry, { when: { field: "authType", is: "basic" } })
   */
  when?: {
    /** Name of field to check */
    field: string;
    /** Value to compare against */
    is: unknown;
    /** Action to take if condition matches */
    then?: 'show' | 'hide' | 'enable' | 'disable';
  };

  /**
   * Load select options from another action
   * WHY: Options often come from API calls (e.g., list channels, list users)
   * This creates a dependency: action X provides options for field Y
   *
   * EXAMPLE: Slack's postMessage action loads channel options from getChannels action
   *
   * @example
   * z.string().register(uiRegistry, {
   *   optionsFrom: {
   *     action: "getChannels",
   *     map: (result) => result.channels.map(c => ({ value: c.id, label: c.name }))
   *   }
   * })
   */
  optionsFrom?: {
    /** Name of action to call for options */
    action: string;
    /** Transform action result into { value, label }[] format */
    map: (result: unknown) => Array<{ value: string | number; label: string }>;
    /** Cache options for this many seconds (default: 300) */
    cacheDuration?: number;
    /** Refresh options when these fields change */
    refreshOn?: string[];
  };

  /**
   * Help text / description shown below field
   * WHY: Complex fields need additional explanation
   * Different from label (short) and placeholder (example)
   * @example z.string().register(uiRegistry, { helpText: "This token can be found in your account settings" })
   */
  helpText?: string;

  /**
   * URL to external documentation for this field
   * WHY: Some fields need detailed docs that don't fit in help text
   * @example z.string().register(uiRegistry, { docsUrl: "https://docs.example.com/api-keys" })
   */
  docsUrl?: string;

  /**
   * Index signature to satisfy Zod's MetadataType constraint
   * Allows additional custom properties while maintaining type safety
   */
  [key: string]: unknown;
}

/**
 * Custom Zod registry for UI metadata
 * WHY: Dedicated registry keeps UI concerns separate from global metadata
 * BENEFIT: .register() returns original schema (more efficient than .meta())
 */
export const uiRegistry = z.registry<UIMetadata>();

/**
 * Helper function to add UI metadata to any Zod schema
 * WHY: Provides type-safe way to attach UI metadata using Zod 4's registry API
 *
 * IMPORTANT: Using registry.add() + returning schema for consistency with
 * Zod patterns (though .register() could also work inline).
 *
 * @example
 * const apiKey = withUIMeta(
 *   z.string(),
 *   { sensitive: true, placeholder: "sk-..." }
 * );
 */
export function withUIMeta<T extends z.ZodTypeAny>(schema: T, metadata: UIMetadata): T {
  uiRegistry.add(schema, metadata);
  return schema;
}

// export function withUIMeta<T extends z.ZodTypeAny>(
//   schema: T,
//   meta: NonNullable<z.ZodTypeDef['uiMeta']>
// ): T {
//   (schema._def as z.ZodTypeDef).uiMeta = meta;
//   return schema;
// }

/**
 * Retrieve UI metadata from a Zod schema
 * @param schema - The Zod schema to get metadata from
 * @returns The UI metadata if it exists, undefined otherwise
 */
export function getUIMeta(schema: z.ZodTypeAny): UIMetadata | undefined {
  return uiRegistry.get(schema);
}

/**
 * Pre-configured schema types for common field patterns
 * WHY: Reduces boilerplate for frequently used field types
 * These are convenience wrappers that apply common metadata
 */
export const UISchemas = {
  /**
   * Secret/password field - automatically masked in UI
   * USED BY: All connectors with API keys/tokens (Slack, OpenAI, Jira, etc.)
   * @example secrets: { apiKey: UISchemas.secret().describe("API Key") }
   */
  secret: (placeholder?: string) =>
    withUIMeta(z.string(), {
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
    withUIMeta(z.string(), {
      widget: 'textarea',
      widgetOptions: options,
    }),

  /**
   * JSON editor field with syntax highlighting
   * USED BY: Webhook (body), OpenAI (functions), Slack (blocks)
   * @example config: UISchemas.json().describe("Configuration object")
   */
  json: () =>
    withUIMeta(z.string(), {
      widget: 'json',
    }),

  /**
   * Code editor field
   * USED BY: Tines (custom scripts), TheHive (case templates)
   * @example script: UISchemas.code("javascript").describe("Custom script")
   */
  code: (language: 'javascript' | 'typescript' | 'python') =>
    withUIMeta(z.string(), {
      widget: 'code',
      widgetOptions: { language },
    }),

  /**
   * URL field with validation
   * USED BY: All webhook-based connectors (Webhook, Cases Webhook, Slack webhook)
   * @example webhookUrl: UISchemas.url().describe("Webhook URL")
   */
  url: (placeholder?: string) =>
    withUIMeta(z.string().url(), {
      widget: 'text',
      placeholder: placeholder ?? 'https://',
    }),
};
