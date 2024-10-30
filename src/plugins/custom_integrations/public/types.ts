/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FC, PropsWithChildren } from 'react';
import { CustomIntegration } from '../common';

export interface CustomIntegrationsSetup {
  getAppendCustomIntegrations: () => Promise<CustomIntegration[]>;
  getReplacementCustomIntegrations: () => Promise<CustomIntegration[]>;
}

export interface CustomIntegrationsStart {
  ContextProvider: FC<PropsWithChildren<unknown>>;
  languageClientsUiComponents: Record<string, FC>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomIntegrationsStartDependencies {}
