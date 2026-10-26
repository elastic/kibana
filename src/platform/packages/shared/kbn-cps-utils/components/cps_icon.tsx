/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';

export const CPSIconDisabled = () => {
  const {
    euiTheme: {
      colors: { textDisabled },
    },
  } = useEuiTheme();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none">
      <path
        fill={textDisabled}
        d="M4.856 13.264c.091.228.144.475.144.736a2 2 0 0 1-2 2c-.26 0-.508-.053-.736-.144l.866-.866a.998.998 0 0 0 .86-.86l.866-.866Z"
      />
      <path
        fill={textDisabled}
        fillRule="evenodd"
        d="M12.5 9a1 1 0 0 1 1 1v2.065A1.999 1.999 0 1 1 11 14c0-.932.638-1.712 1.5-1.935V10h-4v2.065A1.999 1.999 0 1 1 6 14c0-.932.638-1.712 1.5-1.935v-1.444L9.121 9H12.5ZM8 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
        clipRule="evenodd"
      />
      <path
        fill={textDisabled}
        d="M15.354 1.354 1.447 15.259l-.093.095-.708-.707 14-14 .707.707ZM3.879 10H3.5v.379l-1 1V10a1 1 0 0 1 1-1h1.379l-1 1Z"
      />
      <path
        fill={textDisabled}
        fillRule="evenodd"
        d="M7 0a3 3 0 0 1 3 3c0 .383-.075.748-.207 1.085L8.085 5.793A2.969 2.969 0 0 1 7 6a3 3 0 0 1 0-6Zm0 1a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
        clipRule="evenodd"
      />
    </svg>
  );
};
