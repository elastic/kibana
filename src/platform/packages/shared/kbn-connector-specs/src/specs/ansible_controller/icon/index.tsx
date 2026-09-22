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

/** Simplified Ansible mark for 32×32. */
export default (props: ConnectorIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32" {...props}>
    <path fill="none" id="canvas_background" d="M-1-1h66v66H-1z" />
    <path
      d="M61.9 32.8c0 16.897-13.255 30.6-29.6 30.6S2.7 49.697 2.7 32.8c0-16.897 13.255-30.6 29.6-30.6s29.6 13.703 29.6 30.6"
      id="svg_23"
      fill="#c00"
    />
    <path
      d="M47.353 45.11L33.939 12.064c-.385-.957-1.155-1.464-2.09-1.464-.934 0-1.758.507-2.143 1.464L15 48.319h5.03l5.828-14.947 17.399 14.384c.687.59 1.21.844 1.87.844 1.319 0 2.473-1.013 2.473-2.477 0-.225-.082-.591-.247-1.013M31.877 18.003l8.714 22.04-13.167-10.64 4.453-11.4z"
      id="svg_24"
      fill="#fff"
    />
  </svg>
);
