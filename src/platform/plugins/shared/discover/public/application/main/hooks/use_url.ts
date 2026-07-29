/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { History } from 'history';
import useLatest from 'react-use/lib/useLatest';
import { diag } from '../../../utils/diag_trace';

export function useUrl({
  history,
  savedSearchId,
  onNewUrl: currentOnNewUrl,
}: {
  history: History;
  savedSearchId: string | undefined;
  onNewUrl: () => void;
}) {
  const onNewUrl = useLatest(currentOnNewUrl);

  /**
   * Url / Routing logic
   */
  useEffect(() => {
    // this listener is waiting for such a path http://localhost:5601/app/discover#/
    // which could be set through pressing "New" button in top nav or go to "Discover" plugin from the sidebar
    // to reload the page in a right way
    const unlistenHistoryBasePath = history.listen(({ pathname, search, hash }, action) => {
      diag('useUrl:historyChange', {
        pathname,
        action,
        hasSearch: Boolean(search),
        hasHash: Boolean(hash),
      });
      if (action !== 'REPLACE' && pathname === '/' && !search && !hash && !savedSearchId) {
        diag('useUrl:onNewUrl', { pathname, action });
        onNewUrl.current();
      }
    });

    return () => unlistenHistoryBasePath();
  }, [history, savedSearchId, onNewUrl]);
}
