/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IntegrationsService } from '@kbn/core-integrations-browser-internal';

export type IntegrationsServiceContract = PublicMethodsOf<IntegrationsService>;
export type IntegrationsServiceMock = jest.Mocked<IntegrationsServiceContract>;

const createMock = (): IntegrationsServiceMock => ({
  setup: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
});

export const integrationsServiceMock = {
  create: createMock,
};
