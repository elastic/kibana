/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

export function Links(doc: any) {
  return (
    <div>
      <EuiSpacer size="m" />

      <EuiText size="xs">
        <p>
          <em>
            <a href="https://opentelemetry.io/docs/specs/otel/trace/api/#link">Span Links</a> allow
            links to record links to other spans.
          </em>
        </p>
        <p>
          <em>TODO: Display span links here</em>
        </p>
      </EuiText>
      <EuiBadge css={{ float: 'right' }}>
        <span role="img" aria-label="Teacher hat">
          🎓
        </span>{' '}
        Teacher Edition
      </EuiBadge>
    </div>
  );
}
