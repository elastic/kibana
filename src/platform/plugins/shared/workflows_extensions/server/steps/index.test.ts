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
import { ScriptsJavaScriptStepTypeId } from '../../common/steps/javascript';
import { ServerStepRegistry } from '../step_registry';

describe('registerInternalStepDefinitions', () => {
  it('does not register scripts.javaScript when javaScriptStep is disabled', () => {
    const registry = new ServerStepRegistry(loggerMock.create());

    registerInternalStepDefinitions(registry, {
      experimentalSteps: { javaScriptStep: false },
    });

    expect(registry.has(ScriptsJavaScriptStepTypeId)).toBe(false);
  });

  it('registers scripts.javaScript when javaScriptStep is enabled', () => {
    const registry = new ServerStepRegistry(loggerMock.create());

    registerInternalStepDefinitions(registry, {
      experimentalSteps: { javaScriptStep: true },
    });

    expect(registry.has(ScriptsJavaScriptStepTypeId)).toBe(true);
  });
});
