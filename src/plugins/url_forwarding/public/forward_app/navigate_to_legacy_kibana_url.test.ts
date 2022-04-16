/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ForwardDefinition } from '..';
import { navigateToLegacyKibanaUrl } from './navigate_to_legacy_kibana_url';
import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

describe('migrate legacy kibana urls', () => {
  let forwardDefinitions: ForwardDefinition[];
  let coreStart: CoreStart;

  beforeEach(() => {
    coreStart = coreMock.createStart({ basePath: '/base/path' });
    forwardDefinitions = [
      {
        legacyAppId: 'myApp',
        newAppId: 'updatedApp',
        rewritePath: jest.fn(() => '/new/path'),
      },
    ];
  });

  it('should do nothing if no forward definition is found', () => {
    const result = navigateToLegacyKibanaUrl(
      '/myOtherApp/deep/path',
      forwardDefinitions,
      coreStart.http.basePath,
      coreStart.application
    );

    expect(result).toEqual({ navigated: false });
    expect(coreStart.application.navigateToApp).not.toHaveBeenCalled();
  });

  it('should call navigateToApp with migrated URL', () => {
    const result = navigateToLegacyKibanaUrl(
      '/myApp/deep/path',
      forwardDefinitions,
      coreStart.http.basePath,
      coreStart.application
    );

    expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('updatedApp', {
      path: '/new/path',
      replace: true,
    });
    expect(forwardDefinitions[0].rewritePath).toHaveBeenCalledWith('/myApp/deep/path');
    expect(result).toEqual({ navigated: true });
  });
});
