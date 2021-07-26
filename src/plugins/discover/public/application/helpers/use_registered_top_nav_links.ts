/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useMemo, useState } from 'react';
import { TopNavMenuData } from '../../../../navigation/public';
import { DiscoverLayoutProps } from '../apps/main/components/layout/types';
import { Query } from '../../../../../../../../../../../private/var/tmp/_bazel_quynhnguyen/bd5cc7ce3740c1abb2c63a2609d8bb9f/execroot/kibana/bazel-out/darwin-fastbuild/bin/packages/kbn-es-query';
import { TimeRange } from '../../../../data/common';
import { GetStateReturn } from '../apps/main/services/discover_state';

export type UseRegisteredTopNavLinksProps = Pick<
  DiscoverLayoutProps,
  'indexPattern' | 'navigateTo' | 'savedSearch' | 'services' | 'searchSource'
> & {
  onOpenInspector: () => void;
  query?: Query;
  savedQuery?: string;
  updateQuery: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  stateContainer: GetStateReturn;
  columns: string[];
};

export const useRegisteredTopNavLinks = ({
  services,
  indexPattern,
  onOpenInspector,
  query,
  savedQuery,
  stateContainer,
  updateQuery,
  searchSource,
  navigateTo,
  savedSearch,
  columns,
}: UseRegisteredTopNavLinksProps) => {
  const [registeredTopNavLinks, setRegisteredTopNavLinks] = useState<TopNavMenuData[]>([]);

  useEffect(() => {
    let unmounted = false;

    const loadRegisteredTopNavLinks = async () => {
      if (services?.addTopNavData) {
        const callbacks = services.addTopNavData.getTopNavLinkGetters();
        const params = {
          indexPattern,
          onOpenInspector,
          query,
          savedQuery,
          stateContainer,
          updateQuery,
          searchSource,
          navigateTo,
          savedSearch,
          services,
          columns,
        };
        const links = await Promise.all(
          callbacks.map((cb) => {
            return cb(params);
          })
        );

        if (!unmounted) {
          setRegisteredTopNavLinks(links);
        }
      }
    };
    loadRegisteredTopNavLinks();

    return () => {
      unmounted = true;
    };
  }, [
    services?.addTopNavData,
    indexPattern,
    onOpenInspector,
    query,
    savedQuery,
    stateContainer,
    updateQuery,
    searchSource,
    navigateTo,
    savedSearch,
    services,
    columns,
  ]);
  return useMemo(() => registeredTopNavLinks, [registeredTopNavLinks]);
};
