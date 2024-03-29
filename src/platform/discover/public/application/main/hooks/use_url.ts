/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { History } from 'history';
import { getProfile } from '../../../../common/customizations';

export function useUrl({
  history,
  savedSearchId,
  onNewUrl,
}: {
  history: History;
  savedSearchId: string | undefined;
  onNewUrl: () => void;
}) {
  /**
   * Url / Routing logic
   */
  useEffect(() => {
    // this listener is waiting for such a path http://localhost:5601/app/discover#/
    // which could be set through pressing "New" button in top nav or go to "Discover" plugin from the sidebar
    // to reload the page in a right way
    const unlistenHistoryBasePath = history.listen(({ pathname, search, hash }) => {
      const { isProfileRootPath } = getProfile(pathname);

      if ((pathname === '/' || isProfileRootPath) && !search && !hash && !savedSearchId) {
        onNewUrl();
      }
    });
    return () => unlistenHistoryBasePath();
  }, [history, savedSearchId, onNewUrl]);
}
