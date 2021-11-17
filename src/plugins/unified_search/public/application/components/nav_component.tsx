/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useState, useEffect } from 'react';

import { AppMountParameters } from 'kibana/public';
import { useKibana } from '../../../../kibana_react/public';
import { UnifiedSearchServices, UnifiedSearchAppState } from '../types';
import { APP_ID } from '../../../common';
import type { IndexPattern } from '../../../../data/public';

interface UnifiedSearchTopNavProps {
  currentAppState?: UnifiedSearchAppState;
  isChromeVisible?: boolean;
  onAppLeave: AppMountParameters['onAppLeave'];
  setAppState: any;
}

const TopNav = ({
  currentAppState,
  isChromeVisible,
  onAppLeave,
  setAppState,
}: UnifiedSearchTopNavProps) => {
  const { services } = useKibana<UnifiedSearchServices>();
  const { TopNavMenu } = services.navigation.ui;
  const { setHeaderActionMenu } = services;

  const doReload = useCallback(async () => {
    // start a new session to make sure all data is up to date
    services.data.search.session.start();
  }, [services.data.search.session]);

  const onQuerySubmit = useCallback(
    (payload) => {
      const { dateRange, query } = payload;
      setAppState({ query });
      const currentRange = services.data.query.timefilter.timefilter.getTime();
      if (dateRange.from !== currentRange.from || dateRange.to !== currentRange.to) {
        services.data.query.timefilter.timefilter.setTime(dateRange);
        setAppState({ timeRange: dateRange });
      } else {
        doReload();
      }
    },
    [doReload, services.data.query.timefilter.timefilter, setAppState]
  );

  const [indexPatterns, setIndexPatterns] = useState<IndexPattern[]>([]);

  useEffect(() => {
    return () => {
      // reset on app leave handler so leaving from the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [onAppLeave]);

  useEffect(() => {
    const asyncSetIndexPattern = async () => {
      let indexes: IndexPattern[] | undefined;
      if (!indexes || !indexes.length) {
        const defaultIndex = await services.data.dataViews.getDefault();
        if (defaultIndex) {
          indexes = [defaultIndex];
        }
      }
      if (indexes) {
        setIndexPatterns(indexes);
      }
    };

    asyncSetIndexPattern();
  }, [services.data.dataViews]);

  useEffect(() => {
    const autoRefreshFetchSub = services.data.query.timefilter.timefilter
      .getAutoRefreshFetch$()
      .subscribe(async (done) => {
        try {
          await doReload();
        } finally {
          done();
        }
      });
    return () => {
      autoRefreshFetchSub.unsubscribe();
    };
  }, [services.data.query.timefilter.timefilter, doReload]);
  // console.log('TopNav');

  return isChromeVisible ? (
    <TopNavMenu
      appName={APP_ID}
      setMenuMountPoint={setHeaderActionMenu}
      onQuerySubmit={onQuerySubmit}
      savedQueryId={currentAppState?.savedQuery}
      indexPatterns={indexPatterns}
      screenTitle="Unified search experience"
      showAutoRefreshOnly={false}
      showDatePicker={true}
      showFilterBar={true}
      showQueryInput={true}
      showSaveQuery={true}
      showSearchBar
      useDefaultBehaviors
    />
  ) : null;
};

export const UnifiedSearchTopNav = memo(TopNav);
