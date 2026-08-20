/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock, EuiText } from '@elastic/eui';
import { Markdown } from '@kbn/shared-ux-markdown';
import React from 'react';
import { MaybeViewMore } from './view_more';

function tryParseJson(value: unknown): { parsed: unknown; isJson: boolean } {
  if (typeof value === 'object' && value !== null) {
    return { parsed: value, isJson: true };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return { parsed: JSON.parse(trimmed), isJson: true };
      } catch {
        // not JSON
      }
    }
  }
  return { parsed: value, isJson: false };
}

/**
 * Returns true when every element of the array is a primitive (string, number, or boolean).
 * Simple arrays like finish_reasons: ["stop"] should render as plain text, not a JSON code block.
 */
function isSimpleArray(value: unknown): value is Array<string | number | boolean> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    )
  );
}

interface Props {
  value: unknown;
}

/** Renders a gen_ai field value: prettified JSON, markdown, or plain text. */
export function GenAiFieldValue({ value }: Props) {
  const { parsed, isJson } = tryParseJson(value);

  if (isJson) {
    // Flat primitive arrays (e.g. finish_reasons: ["stop"]) are far more readable as
    // comma-separated plain text than as a JSON code block.
    if (isSimpleArray(parsed)) {
      return (
        <EuiText size="s">
          <span>{(parsed as Array<string | number | boolean>).join(', ')}</span>
        </EuiText>
      );
    }
    const str = JSON.stringify(parsed, null, 2);
    return (
      <MaybeViewMore content={str}>
        <EuiCodeBlock language="json" paddingSize="m" fontSize="s" isCopyable overflowHeight={300}>
          {str}
        </EuiCodeBlock>
      </MaybeViewMore>
    );
  }

  const str = String(value ?? '');

  // Use the Markdown renderer when the string contains explicit markdown markers.
  // Checking `/(^|\n)#/` instead of a bare `str.includes('#')` avoids false positives
  // from URLs (https://example.com/page#anchor) and hex color strings (#ff0000).
  if (str.includes('\n') || str.includes('**') || str.includes('`') || /(^|\n)#/.test(str)) {
    return (
      <MaybeViewMore content={str}>
        <Markdown readOnly>{str}</Markdown>
      </MaybeViewMore>
    );
  }

  return (
    <MaybeViewMore content={str}>
      <EuiText size="s">
        <span>{str}</span>
      </EuiText>
    </MaybeViewMore>
  );
}
