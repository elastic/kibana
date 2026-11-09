/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

// Kibana-only: hardcoded locally so this icon isn't shared/owned by EUI.
interface AiAssistantLogoProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
  titleId?: string;
}

export const AiAssistantLogo = ({ title, titleId, ...svgProps }: AiAssistantLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    aria-labelledby={titleId}
    {...svgProps}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path d="M9 7H15V16H9V7Z" fill="currentColor" />
    <path
      d="M1 11.5C1 9.01472 3.01472 7 5.5 7H7V16H5.5C3.01472 16 1 13.9853 1 11.5Z"
      fill="currentColor"
    />
    <path
      d="M15 3C15 4.65685 13.6569 6 12 6C10.3431 6 9 4.65685 9 3C9 1.34315 10.3431 0 12 0C13.6569 0 15 1.34315 15 3Z"
      fill="currentColor"
    />
    <path d="M1.5 5.75C1.5 2.71243 3.96243 0.25 7 0.25V5.75H1.5Z" fill="currentColor" />
  </svg>
);
