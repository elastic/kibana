/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionPersistence } from './persistence';
import { showSessionLoadWarning } from './show_session_load_warning';

/** Loads a Discover session and warns when the server omitted unsupported content. */
export const loadDiscoverSession = async ({
  id,
  persistence,
  core,
}: {
  id: string;
  persistence: DiscoverSessionPersistence;
  core: Pick<CoreStart, 'notifications' | 'overlays' | 'rendering'>;
}): Promise<DiscoverSession> => {
  const { session, warnings } = await persistence.get(id);

  if (warnings.length) {
    showSessionLoadWarning({ warnings, core });
  }

  return session;
};
