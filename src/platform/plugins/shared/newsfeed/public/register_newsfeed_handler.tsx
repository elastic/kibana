/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { NewsfeedApi } from './lib/api';
import type { NewsfeedSidebarController } from './sidebar/controller';

export const registerNewsfeedHandler = ({
  core,
  api,
  sidebarController,
}: {
  core: CoreStart;
  api: NewsfeedApi;
  sidebarController: NewsfeedSidebarController;
}) => {
  return core.chrome.next.registerNewsfeedHandler({
    open: sidebarController.open,
    hasNew$: api.fetchResults$.pipe(map((result) => result?.hasNew ?? false)),
  });
};
