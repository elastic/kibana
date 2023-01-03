/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomBrandingService } from './custom_branding_service';
import { mockCoreContext } from '@kbn/core-base-server-mocks';

describe('#setup', () => {
  const coreContext: ReturnType<typeof mockCoreContext.create> = mockCoreContext.create();

  it('registers plugin correctly', () => {
    const service = new CustomBrandingService(coreContext);
    const { register } = service.setup();
    register('pluginName');
    expect(() => {
      register('anotherPlugin');
    }).toThrow('Another plugin already registered');
  });
});
