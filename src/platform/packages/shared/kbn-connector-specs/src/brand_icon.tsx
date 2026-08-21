/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import React from 'react';
import type { ConnectorIconProps } from './types';

/** Reversed fill every brand below uses on dark surfaces. */
const DARK_MODE_FILL = '#FFFFFF';

/**
 * The brand fill on light surfaces, reversed to white on dark ones — the
 * treatment every one of these brands asks for. `currentColor` isn't a
 * substitute: the Kibana text color resolves to a washed-out grey that reads as
 * off-brand next to the real mark.
 *
 * Use this directly for multi-color marks where only one element needs to
 * reverse, and {@link createBrandIcon} for marks that are a single color.
 */
export const useBrandFill = (lightModeFill: string): string => {
  const { colorMode } = useEuiTheme();
  return colorMode === 'DARK' ? DARK_MODE_FILL : lightModeFill;
};

/** {@link useBrandFill} applied to a whole single-color glyph. */
export const createBrandIcon =
  (Glyph: React.ComponentType<React.SVGProps<SVGSVGElement>>, lightModeFill: string) =>
  (props: ConnectorIconProps) => {
    const fill = useBrandFill(lightModeFill);
    return <EuiIcon type={(iconProps) => <Glyph fill={fill} {...iconProps} />} {...props} />;
  };
