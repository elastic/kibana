/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { keys } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useCallback, useMemo } from 'react';

function getIndexByDocId(hits: DataTableRecord[], id: string) {
  return hits.findIndex((h) => {
    return h.id === id;
  });
}

export const useDiscoverGridFlyoutPagination = ({
  hits,
  hit,
  setExpandedDoc,
}: {
  hits?: DataTableRecord[];
  hit?: DataTableRecord;
  setExpandedDoc: (doc?: DataTableRecord) => void;
}) => {
  const pageCount = useMemo<number>(() => (hits ? hits.length : 0), [hits]);

  const activePage = useMemo<number>(() => {
    if (!hit || !hits || pageCount <= 1) {
      return -1;
    }
    const id = hit.id;
    return getIndexByDocId(hits, id);
  }, [hits, hit, pageCount]);

  const setPage = useCallback(
    (index: number) => {
      if (hits && hits[index]) {
        setExpandedDoc(hits[index]);
      }
    },
    [hits, setExpandedDoc]
  );

  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === keys.ARROW_LEFT || ev.key === keys.ARROW_RIGHT) {
        ev.preventDefault();
        ev.stopPropagation();
        setPage(activePage + (ev.key === keys.ARROW_RIGHT ? 1 : -1));
      }
    },
    [activePage, setPage]
  );

  return {
    activePage,
    setPage,
    onKeyDown,
  };
};
