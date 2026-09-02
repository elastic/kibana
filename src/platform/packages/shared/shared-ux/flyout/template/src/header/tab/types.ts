/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

/** Descriptor produced by resolving a `Header.Tab` part. */
export interface HeaderTabPartDescriptor {
  /** Consumer-facing id that links `Header.Tab` to `Body.TabPanel`. */
  id: string;
  label: ReactNode;
  disabled?: boolean;
  prepend?: ReactNode;
  append?: ReactNode;
  'data-test-subj'?: string;
}

/** Runtime tab descriptor enriched with generated DOM ids. */
export interface HeaderTabDescriptor extends HeaderTabPartDescriptor {
  tabDomId: string;
  panelDomId: string;
}
