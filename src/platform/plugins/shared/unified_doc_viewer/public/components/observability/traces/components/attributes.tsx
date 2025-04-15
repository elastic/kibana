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

export function Attributes(doc: any) {
  return (
    <div>
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <p>
          {' '}
          <em>
            <a href="https://opentelemetry.io/docs/specs/otel/common/#attribute" target="_blank">
              Attributes
            </a>{' '}
            are metadata about signals. Attributes are stored about the signal itself (called "span
            attributes" or "log attributes"), the signal's{' '}
            <a href="https://opentelemetry.io/docs/specs/otel/overview/#resources" target="_blank">
              <code>Resource</code>
            </a>
            , or the signal's{' '}
            <a href="https://opentelemetry.io/docs/specs/otel/glossary/#instrumentation-scope">
              <code>InstrumentationScope</code>
            </a>
            .
          </em>
        </p>
        <p>
          <em>
            TODO: Make something like the table tab, but with attributes broken out into accordion
            sections.
          </em>
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
