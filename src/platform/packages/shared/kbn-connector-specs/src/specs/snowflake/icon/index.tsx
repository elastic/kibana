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

export default (props: ConnectorIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <path
        d="M20.372 14.09l4.39-2.535a.982.982 0 00.36-1.341.982.982 0 00-1.341-.36l-4.39 2.535V7.32a.982.982 0 00-.982-.98.982.982 0 00-.98.98v5.07l-4.39-2.535a.982.982 0 00-1.341.36.982.982 0 00.36 1.341l4.39 2.535-4.39 2.535a.982.982 0 00-.36 1.341.982.982 0 001.341.36l4.39-2.535v5.07a.982.982 0 00.98.98.982.982 0 00.982-.98v-5.07l4.39 2.535a.982.982 0 001.341-.36.982.982 0 00-.36-1.341l-4.39-2.535z"
        fill="#29B5E8"
      />
      <path
        d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm2.429 25.76a.982.982 0 01-.982.98.982.982 0 01-.98-.98v-2.572l-4.39 2.535a.982.982 0 01-1.341-.36.982.982 0 01.36-1.341l4.39-2.535-4.39-2.535a.982.982 0 01-.36-1.341.982.982 0 011.341-.36l4.39 2.535v-5.07l-4.39-2.535a.982.982 0 01-.36-1.341.982.982 0 011.341-.36l4.39 2.535V7.32a.982.982 0 01.98-.98.982.982 0 01.982.98v5.07l4.39-2.535a.982.982 0 011.341.36.982.982 0 01-.36 1.341l-4.39 2.535 4.39 2.535a.982.982 0 01.36 1.341.982.982 0 01-1.341.36l-4.39-2.535v5.07l4.39-2.535a.982.982 0 011.341.36.982.982 0 01-.36 1.341l-4.39 2.535v2.572z"
        fill="#29B5E8"
      />
    </svg>
  );
};
