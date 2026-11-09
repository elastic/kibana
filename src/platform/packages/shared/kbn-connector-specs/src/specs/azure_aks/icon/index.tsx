/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';

/**
 * Azure Kubernetes Service icon: Azure blue background circle with a
 * simplified Kubernetes wheel (6-spoke helm) in white.
 *
 * Inlined as a component rather than an external SVG so that the workflow
 * YAML editor can serialise it to a CSS mask via renderToStaticMarkup.
 */
const AzureAksIconSvg = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" {...props}>
    <defs>
      <radialGradient id="aks-bg" cx="5.72" cy="7.45" r="8.42" gradientUnits="userSpaceOnUse">
        <stop offset="0.18" stopColor="#5ea0ef" />
        <stop offset="0.69" stopColor="#559ced" />
        <stop offset="1" stopColor="#0078d4" />
      </radialGradient>
    </defs>
    {/* Azure blue background */}
    <circle cx="9" cy="9" r="8.5" fill="url(#aks-bg)" />
    {/* Kubernetes wheel: hub + 6 spokes + rim segments */}
    {/* Hub */}
    <circle cx="9" cy="9" r="1.3" fill="#fff" />
    {/* 6 spokes at 0°, 60°, 120°, 180°, 240°, 300° */}
    <line x1="9" y1="9" x2="9" y2="3.5" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
    <line
      x1="9"
      y1="9"
      x2="13.46"
      y2="11.75"
      stroke="#fff"
      strokeWidth="0.9"
      strokeLinecap="round"
    />
    <line
      x1="9"
      y1="9"
      x2="4.54"
      y2="11.75"
      stroke="#fff"
      strokeWidth="0.9"
      strokeLinecap="round"
    />
    <line x1="9" y1="9" x2="9" y2="14.5" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
    <line x1="9" y1="9" x2="4.54" y2="6.25" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
    <line
      x1="9"
      y1="9"
      x2="13.46"
      y2="6.25"
      stroke="#fff"
      strokeWidth="0.9"
      strokeLinecap="round"
    />
    {/* Outer ring */}
    <circle cx="9" cy="9" r="5.2" fill="none" stroke="#fff" strokeWidth="0.85" />
  </svg>
);

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={AzureAksIconSvg} {...props} />;
};
