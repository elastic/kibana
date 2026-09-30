/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { SecondaryHeaderSpacing } from './use_menu_header_style';

const SecondaryHeaderSpacingContext = createContext<SecondaryHeaderSpacing>('standard');

export const SecondaryHeaderSpacingProvider = ({
  spacing = 'standard',
  children,
}: {
  spacing?: SecondaryHeaderSpacing;
  children: ReactNode;
}) => (
  <SecondaryHeaderSpacingContext.Provider value={spacing}>
    {children}
  </SecondaryHeaderSpacingContext.Provider>
);

/**
 * Resolves secondary header spacing from an explicit prop, then Navigation context,
 * then `standard`.
 */
export function useSecondaryHeaderSpacing(
  spacingProp?: SecondaryHeaderSpacing
): SecondaryHeaderSpacing {
  const contextSpacing = useContext(SecondaryHeaderSpacingContext);
  return spacingProp ?? contextSpacing;
}
