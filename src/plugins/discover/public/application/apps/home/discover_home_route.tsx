/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { History } from 'history';
import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { FlexGridColumns } from '@elastic/eui/src/components/flex/flex_grid';
import { ChromeRecentlyAccessedHistoryItem } from 'kibana/public';
import { DiscoverServices } from '../../../build_services';
import { SectionTitle } from './section_title';
import { SavedSearch } from '../../../saved_searches';
import { DiscoverView } from './discover_view';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { LastRecentlyAccessedView } from './last_recently_view';

export interface DiscoverMainProps {
  /**
   * Instance of browser history
   */
  history: History;
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}

const DISPLAY_NUMBER_OF_SAVED_SEARCHES = 3;

export function DiscoverHomeRoute({ services }: DiscoverMainProps) {
  const button = <></>;
  const { core } = services;
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentlyAccessed, setRecentlyAccessed] = useState<SavedSearch[]>([]);

  useEffect(() => {
    async function loadSavedSearches() {
      const result = await services.findSavedSearches(DISPLAY_NUMBER_OF_SAVED_SEARCHES);
      const loadedSavedSearches = [] as SavedSearch[];
      for (const hit of result.hits) {
        const id = hit.id as string;
        const savedSearch = await services.getSavedSearchById(id);
        loadedSavedSearches.push(savedSearch);
      }
      setSavedSearches(loadedSavedSearches);
    }
    loadSavedSearches();
  }, [services]);

  const savedSearchesSection = () => {
    const savedSearchesDisplay: JSX.Element[] = [];
    savedSearches.forEach((savedSearch) => {
      const { title, searchSource, id } = savedSearch;
      const indexPattern = searchSource.getField('index');
      savedSearchesDisplay.push(
        <EuiFlexItem>
          <DiscoverView
            id={id}
            title={title}
            isTimeBased={!!indexPattern?.isTimeBased()}
            application={core.application}
            savedObjectsClient={core.savedObjects.client}
          />
        </EuiFlexItem>
      );
    });
    if (savedSearchesDisplay.length === 0) {
      return <LoadingIndicator />;
    }
    return (
      <EuiFlexGrid columns={savedSearchesDisplay.length as FlexGridColumns}>
        {savedSearchesDisplay}
      </EuiFlexGrid>
    );
  };

  useEffect(() => {
    const lastRecentlyAccessedItems = core.chrome.recentlyAccessed.get();
    const recentlyAccessedSavedSearches = [] as SavedSearch[];
    lastRecentlyAccessedItems.forEach(async (item) => {
      try {
        const savedSearch = await services.getSavedSearchById(item.id);
        recentlyAccessedSavedSearches.push(savedSearch);
      } catch (e) {
        // nothing to do
      }
    });
    setRecentlyAccessed(recentlyAccessedSavedSearches);
  }, [core, services]);

  const lastRecentlyAccessedSection = () => {
    const recentlyAccessedDisplay: JSX.Element[] = [];
    recentlyAccessed.forEach((savedSearch) => {
      const { title, searchSource, id } = savedSearch;
      const indexPattern = searchSource.getField('index');
      recentlyAccessedDisplay.push(
        <EuiFlexItem>
          <LastRecentlyAccessedView
            id={id}
            title={title}
            indexPattern={indexPattern?.title || ''}
          />
        </EuiFlexItem>
      );
    });
    return (
      <EuiFlexGrid columns={recentlyAccessedDisplay.length as FlexGridColumns}>
        {recentlyAccessedDisplay}
      </EuiFlexGrid>
    );
  };

  return (
    <EuiPageTemplate
      restrictWidth={false}
      template="empty"
      pageHeader={{
        iconType: 'inspect',
        pageTitle: 'Select Your Data',
        rightSideItems: [button, <EuiButton>Do something</EuiButton>],
      }}
      direction="column"
    >
      <EuiFlexGrid columns={1}>
        <EuiFlexItem>
          <SectionTitle text="Last Recently" />
          {lastRecentlyAccessedSection()}
        </EuiFlexItem>
        <EuiFlexItem>
          <SectionTitle text="Discover View" />
          {savedSearchesSection()}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle>
            <h1>Data Views</h1>
          </EuiTitle>
          <EuiFlexGrid columns={3}>
            <EuiFlexItem>
              <EuiPanel style={{ height: 200 }} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel style={{ height: 200 }} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel style={{ height: 200 }} />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPageTemplate>
  );
}
