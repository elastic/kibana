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
import type { EuiFlyoutProps } from '@elastic/eui';

/** Static configuration shared with template zones. */
export interface FlyoutTemplateConfig {
  /** Root `data-test-subj`, used to derive zone-level test subjects. */
  dataTestSubj?: string;
  /** Flyout horizontal padding size; the header reads it to bleed dividers to the edges. */
  paddingSize?: EuiFlyoutProps['paddingSize'];
}

const FlyoutTemplateConfigContext = createContext<FlyoutTemplateConfig>({});

export const FlyoutTemplateConfigProvider = ({
  value,
  children,
}: {
  value: FlyoutTemplateConfig;
  children: ReactNode;
}) => (
  <FlyoutTemplateConfigContext.Provider value={value}>
    {children}
  </FlyoutTemplateConfigContext.Provider>
);

export const useFlyoutTemplateConfig = (): FlyoutTemplateConfig =>
  useContext(FlyoutTemplateConfigContext);

/** Derives a zone-level `data-test-subj`. */
export const resolveZoneTestSubj = (
  explicit: string | undefined,
  root: string | undefined,
  suffix: string
): string | undefined => {
  if (explicit) {
    return explicit;
  }
  return root ? `${root}${suffix}` : undefined;
};
