/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock, httpServiceMock } from '@kbn/core/server/mocks';
import { COMMENTS_API_PATH } from '../common';
import { DevCommentsServerPlugin } from './plugin';

const createPlugin = ({ dev, enabled }: { dev: boolean; enabled: boolean }) => {
  const context = coreMock.createPluginInitializerContext({ enabled });
  return new DevCommentsServerPlugin({
    ...context,
    env: { ...context.env, mode: { ...context.env.mode, dev } },
  });
};

describe('DevCommentsServerPlugin', () => {
  it('has the routes registered by the time setup returns', () => {
    const core = coreMock.createSetup();
    const router = httpServiceMock.createRouter();
    core.http.createRouter.mockReturnValue(router);

    createPlugin({ dev: true, enabled: true }).setup(core);

    // The browser may call the routes right after start; none of them may still be on its way.
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: COMMENTS_API_PATH }),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: COMMENTS_API_PATH }),
      expect.any(Function)
    );
  });

  it('registers nothing outside dev mode or when disabled', () => {
    const prod = coreMock.createSetup();
    createPlugin({ dev: false, enabled: true }).setup(prod);
    expect(prod.http.createRouter).not.toHaveBeenCalled();

    const disabled = coreMock.createSetup();
    createPlugin({ dev: true, enabled: false }).setup(disabled);
    expect(disabled.http.createRouter).not.toHaveBeenCalled();
  });
});
