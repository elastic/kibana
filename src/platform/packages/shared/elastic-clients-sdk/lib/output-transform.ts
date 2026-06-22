/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { JsonValue } from '../factory'

/**
 * Picks the specified fields from a JSON value, supporting dot-notation for nested access.
 *
 * - For objects: returns a new object with only the selected fields
 * - For arrays of objects: picks fields from each element
 * - For primitives/non-objects: returns the value unchanged (nothing to pick from)
 *
 * Dot-notation (e.g. `"hits.total"`) descends into nested objects.
 * Missing fields are silently omitted.
 */
export function pickFields (value: JsonValue, fields: string[]): JsonValue {
  if (value === null || typeof value !== 'object') return value

  if (Array.isArray(value)) {
    return value.map((item) => pickFields(item, fields))
  }

  const result: Record<string, JsonValue> = {}
  for (const field of fields) {
    const val = getNestedValue(value, field)
    if (val !== undefined) {
      setNestedValue(result, field, val)
    }
  }
  return result
}

function getNestedValue (obj: Record<string, JsonValue>, path: string): JsonValue | undefined {
  const parts = path.split('.')
  let current: JsonValue = obj
  for (const part of parts) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined
    const next: JsonValue | undefined = (current as Record<string, JsonValue>)[part]
    if (next === undefined) return undefined
    current = next
  }
  return current
}

function setNestedValue (obj: Record<string, JsonValue>, path: string, value: JsonValue): void {
  const parts = path.split('.')
  let current: Record<string, JsonValue> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    if (current[part] === undefined || typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part])) {
      current[part] = {}
    }
    current = current[part] as Record<string, JsonValue>
  }
  current[parts[parts.length - 1]!] = value
}

/**
 * Parses a comma-separated field list into individual field names.
 * Trims whitespace from each field and drops empties.
 */
export function parseFieldList (raw: string): string[] {
  return raw.split(',').map((f) => f.trim()).filter((f) => f.length > 0)
}

/**
 * Renders a value using a Mustache-like template string.
 *
 * Supported syntax:
 * - `{{field}}` — replaced with the field value (dot-notation supported)
 * - `{{field}}` on missing fields — replaced with empty string
 *
 * For arrays: renders one line per element.
 * For primitives: returns the template with `{{.}}` replaced by the value.
 */
export function applyTemplate (value: JsonValue, template: string): string {
  if (value === null || typeof value !== 'object') {
    return template.replace(/\{\{\s*\.?\s*\}\}/g, String(value)) + '\n'
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyTemplate(item, template)).join('')
  }

  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, field: string) => {
    if (field === '.') return JSON.stringify(value)
    const val = getNestedValue(value as Record<string, JsonValue>, field)
    if (val === undefined || val === null) return ''
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }) + '\n'
}
