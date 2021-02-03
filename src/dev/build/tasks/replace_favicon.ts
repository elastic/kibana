/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { copy, Task } from '../lib';

export const ReplaceFavicon: Task = {
  description: 'Replacing favicons with built version',

  async run(config, log, build) {
    await copy(
      config.resolveFromRepo('src/core/server/core_app/assets/favicons/favicon.distribution.png'),
      build.resolvePath('src/core/server/core_app/assets/favicons/favicon.png')
    );

    await copy(
      config.resolveFromRepo('src/core/server/core_app/assets/favicons/favicon.distribution.svg'),
      build.resolvePath('src/core/server/core_app/assets/favicons/favicon.svg')
    );
  },
};
