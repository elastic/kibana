/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { registerInternalStepDefinitions } from '.';
import {
  RemoteHostRunCommandStepTypeId,
  RemoteHostUploadFileStepTypeId,
  RemoteHostDownloadFileStepTypeId,
} from '../../common/steps/remote_host';
import { ServerStepRegistry } from '../step_registry';

describe('registerInternalStepDefinitions', () => {
  it('always registers all remoteHost steps', () => {
    const registry = new ServerStepRegistry(loggerMock.create());

    registerInternalStepDefinitions(registry, { getActionsStart: () => undefined });

    expect(registry.has(RemoteHostRunCommandStepTypeId)).toBe(true);
    expect(registry.has(RemoteHostUploadFileStepTypeId)).toBe(true);
    expect(registry.has(RemoteHostDownloadFileStepTypeId)).toBe(true);
  });
});
