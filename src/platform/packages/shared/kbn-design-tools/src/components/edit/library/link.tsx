/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';

export const LinkRegular = () => (
  <EuiText size="s">
    <p>
      This is a paragraph with an <EuiLink href="#">inline link</EuiLink> inside it.
    </p>
  </EuiText>
);

export const LinkExternal = () => (
  <EuiLink href="#" external>
    External link
  </EuiLink>
);

export const LinkButton = () => <EuiLink onClick={() => {}}>Button-style link</EuiLink>;

export const LinkDisabled = () => (
  <EuiLink onClick={() => {}} disabled>
    Disabled link
  </EuiLink>
);
