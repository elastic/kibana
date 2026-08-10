/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { ConnectorIconProps } from '../../../types';

// Generic padlock glyph (not a reproduction of HashiCorp's trademarked Vault
// logo) used as a placeholder until a licensed brand asset is available.
export default (props: ConnectorIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    width="32"
    height="32"
    role="img"
    aria-label="HashiCorp Vault"
    {...props}
  >
    <path
      fill="#000000"
      d="M16 3.5a7 7 0 0 0-7 7V13H7.5A1.5 1.5 0 0 0 6 14.5v13A1.5 1.5 0 0 0 7.5 29h17a1.5 1.5 0 0 0 1.5-1.5v-13a1.5 1.5 0 0 0-1.5-1.5H23v-2.5a7 7 0 0 0-7-7Zm0 3a4 4 0 0 1 4 4V13h-8v-2.5a4 4 0 0 1 4-4ZM16 19a2.25 2.25 0 0 1 1.1 4.21l.4 2.79h-3l.4-2.79A2.25 2.25 0 0 1 16 19Z"
    />
  </svg>
);
