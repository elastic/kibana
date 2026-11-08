/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCodeBlock } from '@elastic/eui';
import React, { useMemo } from 'react';
import { formatStructuredValue } from './format_structured_value';
import { MaybeViewMore } from './view_more';

interface Props {
  value: unknown;
  'data-test-subj'?: string;
}

/** Renders structured data as readable YAML-like text in a standard code block. */
export function GenAiStructuredValue({ value, 'data-test-subj': dataTestSubj }: Props) {
  const text = useMemo(() => formatStructuredValue(value), [value]);

  return (
    <MaybeViewMore content={text}>
      <EuiCodeBlock
        language="yaml"
        paddingSize="m"
        fontSize="s"
        isCopyable
        // A string height keeps the full screen button without adding the code block's own
        // scroll; MaybeViewMore owns collapsing, so "View more" reveals the whole value.
        overflowHeight="100%"
        data-test-subj={dataTestSubj ?? 'genAiStructuredValue'}
      >
        {text}
      </EuiCodeBlock>
    </MaybeViewMore>
  );
}
