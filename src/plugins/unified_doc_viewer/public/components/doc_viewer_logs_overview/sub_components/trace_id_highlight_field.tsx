/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { HighlightField, HighlightFieldProps } from './highlight_field';

export function TraceIdHighlightField(props: HighlightFieldProps) {
  // Locator would be defined here
  const href = `/foo/app/apm/link-to/trace/${props.value}`;
  return (
    <HighlightField {...props}>
      {({ content }) => <EuiLink href={href}>{content}</EuiLink>}
    </HighlightField>
  );
}
