/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure sanitization functions for Elasticsearch value types.
 *
 * Each sanitizer strips characters that are invalid per the Elasticsearch
 * server source code, returning the cleaned value and a list of changes
 * made. Agents use these to clean user-provided inputs before passing them
 * to CLI commands.
 *
 * Sources: `MetadataCreateIndexService`, `SnapshotsServiceUtils`,
 *          `DataStream`, `ObjectMapper`, `Strings.INVALID_FILENAME_CHARS`.
 */

/** Result returned by every sanitizer function. */
export interface SanitizeResult {
  original: string
  sanitized: string
  type: string
  changes: string[]
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Best-effort list of common zero-width / invisible characters; not exhaustive.
const ZERO_WIDTH_CHARS = new Set([
  '\u200B', '\u200C', '\u200D', '\u200E', '\u200F',
  '\uFEFF', '\u00AD',
  '\u2060', '\u2061', '\u2062', '\u2063', '\u2064',
])

/**
 * Truncates `value` to at most `maxBytes` UTF-8 bytes without splitting
 * multi-byte characters.
 */
export function truncateUtf8 (value: string, maxBytes: number): string {
  const buf = Buffer.from(value, 'utf-8')
  if (buf.length <= maxBytes) return value
  let end = maxBytes
  // Walk backwards to avoid landing in the middle of a multi-byte sequence.
  // A UTF-8 continuation byte has the form 10xxxxxx (0x80..0xBF).
  while (end > 0 && (buf[end]! & 0xC0) === 0x80) {
    end--
  }
  return buf.subarray(0, end).toString('utf-8')
}

function stripChars (value: string, chars: Set<string>): string {
  return Array.from(value).filter(ch => !chars.has(ch)).join('')
}

function stripZeroWidth (value: string): string {
  return Array.from(value).filter(ch => !ZERO_WIDTH_CHARS.has(ch)).join('')
}

// ---------------------------------------------------------------------------
// Index name / alias name
// ---------------------------------------------------------------------------

const INDEX_FORBIDDEN = new Set([
  '\\', '/', '*', '?', '"', '<', '>', '|', ' ', ',', '#', ':',
])

/**
 * Sanitizes a value for use as an Elasticsearch index name or alias name.
 *
 * Rules (from `validateIndexOrAliasName`):
 * - Lowercase
 * - Strip `\\/\*?"<>| ,#:`
 * - Remove leading `_`, `-`, `+`
 * - Truncate to 255 bytes (UTF-8)
 * - Replace the reserved literals `.` and `..`
 */
export function sanitizeIndexName (value: string): SanitizeResult {
  const changes: string[] = []
  let s = stripZeroWidth(value)
  if (s !== value) changes.push('stripped zero-width characters')

  const lowered = s.toLowerCase()
  if (lowered !== s) {
    changes.push('lowercased')
    s = lowered
  }

  const noWhitespace = s.replace(/\s/g, '')
  if (noWhitespace !== s) {
    changes.push('stripped whitespace')
    s = noWhitespace
  }

  const stripped = stripChars(s, INDEX_FORBIDDEN)
  if (stripped !== s) {
    changes.push('stripped forbidden characters')
    s = stripped
  }

  const beforeLeading = s
  s = s.replace(/^[_\-+]+/, '')
  if (s !== beforeLeading) changes.push('removed leading _, -, or + characters')

  if (s === '.' || s === '..') {
    changes.push('replaced reserved dot name')
    s = 'dot'
  }

  if (Buffer.byteLength(s, 'utf-8') > 255) {
    s = truncateUtf8(s, 255)
    changes.push('truncated to 255 bytes')
  }

  if (s.length === 0 && value.length > 0) {
    changes.push('value is empty after sanitization')
  }

  return { original: value, sanitized: s, type: 'index-name', changes }
}

// ---------------------------------------------------------------------------
// Snapshot name
// ---------------------------------------------------------------------------

/**
 * Sanitizes a value for use as an Elasticsearch snapshot name.
 *
 * Nearly the same rules as index names but:
 * - All whitespace is stripped (not just spaces)
 * - Only leading `_` is removed (not `-` or `+`)
 */
export function sanitizeSnapshotName (value: string): SanitizeResult {
  const changes: string[] = []
  let s = stripZeroWidth(value)
  if (s !== value) changes.push('stripped zero-width characters')

  const lowered = s.toLowerCase()
  if (lowered !== s) {
    changes.push('lowercased')
    s = lowered
  }

  const noWhitespace = s.replace(/\s/g, '')
  if (noWhitespace !== s) {
    changes.push('stripped whitespace')
    s = noWhitespace
  }

  const stripped = stripChars(s, INDEX_FORBIDDEN)
  if (stripped !== s) {
    changes.push('stripped forbidden characters')
    s = stripped
  }

  const beforeLeading = s
  s = s.replace(/^_+/, '')
  if (s !== beforeLeading) changes.push('removed leading _ characters')

  if (s === '.' || s === '..') {
    changes.push('replaced reserved dot name')
    s = 'dot'
  }

  if (Buffer.byteLength(s, 'utf-8') > 255) {
    s = truncateUtf8(s, 255)
    changes.push('truncated to 255 bytes')
  }

  if (s.length === 0 && value.length > 0) {
    changes.push('value is empty after sanitization')
  }

  return { original: value, sanitized: s, type: 'snapshot-name', changes }
}

// ---------------------------------------------------------------------------
// Data stream components
// ---------------------------------------------------------------------------

const DATA_STREAM_TYPE_DATASET_FORBIDDEN = new Set([
  '\\', '/', '*', '?', '"', '<', '>', '|', ' ', ',', '#', ':', '-',
])

const DATA_STREAM_NAMESPACE_FORBIDDEN = new Set([
  '\\', '/', '*', '?', '"', '<', '>', '|', ' ', ',', '#', ':',
])

/** Sanitizes a data stream `type` component. */
export function sanitizeDataStreamType (value: string): SanitizeResult {
  return sanitizeDataStreamComponent(value, DATA_STREAM_TYPE_DATASET_FORBIDDEN, 'data-stream-type')
}

/** Sanitizes a data stream `dataset` component. */
export function sanitizeDataStreamDataset (value: string): SanitizeResult {
  return sanitizeDataStreamComponent(value, DATA_STREAM_TYPE_DATASET_FORBIDDEN, 'data-stream-dataset')
}

/** Sanitizes a data stream `namespace` component (allows hyphens). */
export function sanitizeDataStreamNamespace (value: string): SanitizeResult {
  return sanitizeDataStreamComponent(value, DATA_STREAM_NAMESPACE_FORBIDDEN, 'data-stream-namespace')
}

function sanitizeDataStreamComponent (value: string, forbidden: Set<string>, type: string): SanitizeResult {
  const changes: string[] = []
  let s = stripZeroWidth(value)
  if (s !== value) changes.push('stripped zero-width characters')

  const stripped = stripChars(s, forbidden)
  if (stripped !== s) {
    changes.push('stripped forbidden characters')
    s = stripped
  }

  if (s.length === 0 && value.length > 0) {
    changes.push('value is empty after sanitization')
  }

  return { original: value, sanitized: s, type, changes }
}

// ---------------------------------------------------------------------------
// Field name
// ---------------------------------------------------------------------------

/**
 * Sanitizes a mapping field name.
 *
 * Lighter restrictions: only trims whitespace and warns about dots
 * (which create object hierarchies in Elasticsearch).
 */
export function sanitizeFieldName (value: string): SanitizeResult {
  const changes: string[] = []
  let s = stripZeroWidth(value)
  if (s !== value) changes.push('stripped zero-width characters')

  const trimmed = s.trim()
  if (trimmed !== s) {
    changes.push('trimmed whitespace')
    s = trimmed
  }

  if (s.length === 0) {
    changes.push('value is empty after sanitization')
    return { original: value, sanitized: '', type: 'field-name', changes }
  }

  if (s.includes('.')) {
    changes.push('dots present — these create nested object hierarchies in mappings')
  }

  return { original: value, sanitized: s, type: 'field-name', changes }
}

// ---------------------------------------------------------------------------
// Pipeline name
// ---------------------------------------------------------------------------

/**
 * Sanitizes an ingest pipeline name.
 * Uses the same rules as index names (`validateIndexOrAliasName`).
 */
export function sanitizePipelineName (value: string): SanitizeResult {
  const result = sanitizeIndexName(value)
  return { ...result, type: 'pipeline-name' }
}

// ---------------------------------------------------------------------------
// Snapshot repository name
// ---------------------------------------------------------------------------

const FILENAME_FORBIDDEN = new Set([
  '\\', '/', '*', '?', '"', '<', '>', '|', ':',
])

/**
 * Sanitizes a snapshot repository name.
 * Strips invalid filename characters (`Strings.INVALID_FILENAME_CHARS`).
 * Does not lowercase — repository names are case-preserving.
 */
export function sanitizeRepositoryName (value: string): SanitizeResult {
  const changes: string[] = []
  let s = stripZeroWidth(value)
  if (s !== value) changes.push('stripped zero-width characters')

  const stripped = stripChars(s, FILENAME_FORBIDDEN)
  if (stripped !== s) {
    changes.push('stripped invalid filename characters')
    s = stripped
  }

  if (s.length === 0 && value.length > 0) {
    changes.push('value is empty after sanitization')
  }

  return { original: value, sanitized: s, type: 'repository-name', changes }
}
