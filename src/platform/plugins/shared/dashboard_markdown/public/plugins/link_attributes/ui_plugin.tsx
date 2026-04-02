/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCodeBlock, EuiText } from '@elastic/eui';

// EUI's type requires `button` and `formatting`/`editor`, but passing an empty
// `button` and omitting both formatting and editor successfully adds help text
// to the help popup without rendering a toolbar button.
export const linkAttributesUiPlugin = {
  name: 'linkAttributes',
  button: {},
  helpText: (
    <div>
      <EuiText size="xs">
        <p>
          Add attributes to links by appending curly braces after the link. Currently only{' '}
          <code>target</code> is supported
        </p>
      </EuiText>
      <EuiCodeBlock language="md" paddingSize="s" fontSize="l">
        {'[link text](url){target="_blank"}'}
      </EuiCodeBlock>
    </div>
  ),
};
