/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import type { CustomIntegrationRegistry } from '../custom_integration_registry';
import type { IntegrationCategory } from '../../common';
interface ExternalIntegration {
  id: string;
  title: string;
  icon?: string;
  euiIconName?: string;
  description: string;
  docUrlTemplate: string;
  categories: IntegrationCategory[];
}
export declare const integrations: ExternalIntegration[];
export declare function registerExternalIntegrations(
  core: CoreSetup,
  registry: CustomIntegrationRegistry,
  branch: string
): void;
export {};
