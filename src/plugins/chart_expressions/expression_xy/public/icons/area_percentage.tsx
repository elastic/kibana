/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

export const AreaPercentageIcon = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    viewBox="0 0 30 22"
    width={30}
    height={22}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      d="M0 13v8a1 1 0 001 1h28a1 1 0 001-1V9.25c-1.251-.929-2.45-1.734-3.493-2.313a11.028 11.028 0 00-1.478-.703C24.592 6.072 24.25 6 24 6c-.262 0-.63.212-1.126.77-.472.53-.952 1.249-1.458 2.007l-.013.02c-.49.736-1.006 1.51-1.53 2.098C19.37 11.462 18.739 12 18 12c-1.062 0-2.112-.263-3.092-.508l-.03-.007C13.869 11.232 12.929 11 12 11c-.337 0-.729.171-1.2.525-.466.35-.94.822-1.446 1.329l-.015.015c-.49.489-1.01 1.01-1.539 1.406-.529.396-1.137.725-1.8.725-.657 0-1.57-.212-2.48-.424l-.058-.014C2.275 14.287 1.032 14 0 14v-1z"
      className="lensChartIcon__accent"
    />
    <path
      d="M29 0a1 1 0 011 1v6.012c-1.06-.764-2.085-1.437-3.007-1.95a11.93 11.93 0 00-1.616-.765C24.887 4.115 24.418 4 24 4c-.738 0-1.369.538-1.874 1.105-.523.589-1.039 1.362-1.529 2.098l-.013.02c-.506.758-.985 1.476-1.458 2.007-.495.558-.864.77-1.126.77-.928 0-1.867-.232-2.879-.485l-.029-.007C14.112 9.263 13.062 9 12 9c-.663 0-1.271.328-1.8.725-.528.396-1.05.917-1.538 1.406l-.015.015c-.507.507-.98.98-1.447 1.329-.471.354-.863.525-1.2.525-.528 0-1.328-.183-2.311-.412l-.034-.007C2.507 12.314 1.159 12 .001 12V1a1 1 0 011-1h28z"
      className="lensChartIcon__subdued"
    />
  </svg>
);
