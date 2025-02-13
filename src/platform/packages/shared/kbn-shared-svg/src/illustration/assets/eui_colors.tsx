/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css, Global } from '@emotion/react';

/**
 * The color variables for the Amsterdam theme.
 */
export const amsterdamColors = {
  '--eui-color-primary': '#0077cc',
  '--eui-color-accent': '#f04e98',
  '--eui-color-warning': '#fec514',
  '--eui-color-success': '#00bfb3',
  '--eui-color-danger': '#bd271e',
};

/**
 * The color variables for the Borealis theme.
 */
export const borealisColors = {
  '--eui-color-primary': '#0b64dd',
  '--eui-color-accent': '#f588b3',
  '--eui-color-warning': '#ddbf66',
  '--eui-color-success': '#7ed8a9',
  '--eui-color-danger': '#c61e25',
};

const amsterdam = css`
  :root {
    ${Object.entries(amsterdamColors).map(([key, value]) => `${key}: ${value};`)}
  }
`;

const borealis = css`
  :root {
    ${Object.entries(borealisColors).map(([key, value]) => `${key}: ${value};`)}
  }
`;

const themes = { amsterdam, borealis } as const;

/**
 * Props for the `IllustrationEuiColors` component.
 */
export interface IllustrationGlobalColorsProps {
  theme: keyof typeof themes;
}

/**
 * Component responsible for adding the EUI color palette CSS variables to the global scope.
 */
export const IllustrationEuiColors = ({ theme }: IllustrationGlobalColorsProps) => {
  return <Global styles={{ ...themes[theme] }} />;
};
