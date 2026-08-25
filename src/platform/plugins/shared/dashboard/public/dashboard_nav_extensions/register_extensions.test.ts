/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { coreLifecycleMock } from '@kbn/core-lifecycle-browser-mocks';
import { registerNavExtensions } from './register_extensions';
import { RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID } from './extensions';

const createNavigationMock = () => navigationPluginMock.createSetupContract();

describe('registerNavExtensions', () => {
  it('registers all dashboard extensions at setup', () => {
    const navigation = createNavigationMock();

    registerNavExtensions({ navigation });

    expect(navigation.registerNavigationExtension).toHaveBeenCalledTimes(1);
    expect(navigation.registerNavigationExtension).toHaveBeenCalledWith(
      expect.objectContaining({ id: RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID }),
      expect.any(Function)
    );
  });

  it('throws when createData$ is invoked before start()', () => {
    const navigation = createNavigationMock();

    registerNavExtensions({ navigation });

    const createData$ = navigation.registerNavigationExtension.mock.calls[0]?.[1] as () => unknown;

    expect(() => createData$()).toThrow(
      `${RECENTLY_ACCESSED_DASHBOARDS_EXTENSION_ID}: createData$ called before dashboard plugin start()`
    );
  });

  it('binds extension data factories after start()', async () => {
    const navigation = createNavigationMock();
    const core = coreLifecycleMock.createCoreStart();
    const { start } = registerNavExtensions({ navigation });

    start(core);

    const createData$ = navigation.registerNavigationExtension.mock.calls[0]?.[1] as () => unknown;

    await expect(createData$()).toBeInstanceOf(Observable);
  });
});
