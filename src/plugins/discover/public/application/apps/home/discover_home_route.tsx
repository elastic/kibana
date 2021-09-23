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
  EuiCard,
  EuiIcon,
} from '@elastic/eui';
import { FlexGridColumns } from '@elastic/eui/src/components/flex/flex_grid';
import { DataView } from 'src/plugins/data/common';
import { DiscoverServices } from '../../../build_services';
import { SectionTitle } from './section_title';
import { SavedSearch } from '../../../saved_searches';
import { DiscoverView } from './discover_view';
import { LastRecentlyAccessedView } from './last_recently_view';
import { IndexPatternView } from './index_pattern_view';
import { SectionNavigation } from './section_navigation';

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

const DISPLAY_NUMBER_OF_ITEMS = 3;
const MAX_NUMBER_OF_SAVED_SEARCHES = 30;

export function DiscoverHomeRoute({ services }: DiscoverMainProps) {
  const { core } = services;
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentlyAccessed, setRecentlyAccessed] = useState<SavedSearch[]>([]);
  const [indexPatterns, setIndexPatterns] = useState<DataView[]>([]);

  useEffect(() => {
    async function loadSavedSearches() {
      const result = await services.findSavedSearches(MAX_NUMBER_OF_SAVED_SEARCHES);
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
    const savedSearchesToDisplay: JSX.Element[] = savedSearches.map((savedSearch) => {
      const { title, searchSource, id } = savedSearch;
      const indexPattern = searchSource.getField('index');
      return (
        <DiscoverView
          id={id}
          title={title}
          isTimeBased={!!indexPattern?.isTimeBased()}
          application={core.application}
          savedObjectsClient={core.savedObjects.client}
        />
      );
    });
    return (
      <SectionNavigation
        items={savedSearchesToDisplay}
        itemsPerPage={DISPLAY_NUMBER_OF_ITEMS}
        page={0}
      />
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

  useEffect(() => {
    async function loadIndexPatterns() {
      const savedObjectsClient = services.core.savedObjects.client;
      const result = await savedObjectsClient.find({
        type: 'index-pattern',
        sortField: 'created_at',
      });
      const loadedIndexPatterns = [] as DataView[];
      for (const savedObject of result.savedObjects.reverse()) {
        const indexPattern = await services.indexPatterns.get(savedObject.id);
        loadedIndexPatterns.push(indexPattern);
      }
      setIndexPatterns(loadedIndexPatterns);
    }
    loadIndexPatterns();
  }, [services]);

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

  const addNewIndexPattern = (
    <EuiCard
      icon={<EuiIcon size="xxl" type="plusInCircle" />}
      title={'Add New'}
      description=""
      onClick={() => {}}
    />
  );

  const indexPatternsSection = () => {
    const displayElements = indexPatterns.map((indexPattern) => (
      <IndexPatternView indexPattern={indexPattern} />
    ));
    return (
      <EuiFlexGrid>
        <EuiFlexItem grow={1} style={{height: '117px'}}>{addNewIndexPattern}</EuiFlexItem>
        <EuiFlexItem grow={9}>
          <SectionNavigation
            items={displayElements}
            page={0}
            itemsPerPage={DISPLAY_NUMBER_OF_ITEMS}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  };

  const goToDiscover = () => {
    const { application } = services.core;
    if (!application) return;
    const path = `#/`;
    application.navigateToApp('discover', { path });
  };

  const discoverButton = <EuiButton onClick={goToDiscover}>Go To Discover</EuiButton>;

  return (
    <EuiPageTemplate
      restrictWidth={false}
      template="empty"
      pageHeader={{
        iconType: 'inspect',
        pageTitle: 'Select Your Data',
        rightSideItems: [discoverButton],
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
          <SectionTitle text={'DataViews'} />
          {indexPatternsSection()}
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPageTemplate>
  );
}
