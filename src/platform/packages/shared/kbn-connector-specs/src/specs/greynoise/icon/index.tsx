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
 * GreyNoise only publishes the mark as a raster, white-on-black, and a bitmap
 * can't be re-tinted per theme — the black plate was reading as a hole punched
 * in the dark canvas. So the bitmap is used as a luminance mask (its white
 * strokes become the visible part) and the paint comes from `currentColor`,
 * which lands on the theme's text tone the same way the other monochrome step
 * icons do.
 */
const MASK =
  'data:image/png;base64,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';

const GreyNoiseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" {...props}>
    <mask id="greynoiseGlyphMask">
      <image href={MASK} width="64" height="64" />
    </mask>
    <rect width="64" height="64" fill="currentColor" mask="url(#greynoiseGlyphMask)" />
  </svg>
);

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={GreyNoiseIcon} {...props} />;
};
