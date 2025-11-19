/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React from 'react';

// TODO: This is duplicated code. It should be removed when the logo becomes available in EUI.

const AssistantLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="100%"
    width="100%"
    viewBox="0 0 64 64"
    fill="none"
    {...props}
  >
    <path fill="#F04E98" d="M36 28h24v36H36V28Z" />
    <path fill="#02BCB7" d="M4 46c0-9.941 8.059-18 18-18h6v36h-6c-9.941 0-18-8.059-18-18Z" />
    <path
      fill="#0B64DD"
      d="M60 12c0 6.627-5.373 12-12 12s-12-5.373-12-12S41.373 0 48 0s12 5.373 12 12Z"
    />
    <path fill="#FEC514" d="M6 23C6 10.85 15.85 1 28 1v22H6Z" />
  </svg>
);

/**
 * Props for the AI Assistant icon.
 */
export type AssistantIconProps = Omit<EuiIconProps, 'type'>;

/**
 * Default Elastic AI Assistant icon.
 */
export const AssistantIcon = ({ size = 'm', ...rest }: AssistantIconProps) => {
  return <EuiIcon {...{ type: AssistantLogo, size, ...rest }} />;
};
