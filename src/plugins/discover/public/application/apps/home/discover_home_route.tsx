/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { cloneDeep } from 'lodash';
import { History } from 'history';
import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPageTemplate,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';
import { DataView } from 'src/plugins/data/common';
import moment from 'moment';
import { DiscoverServices } from '../../../build_services';
import { SectionTitle } from './section_title';
import { SavedSearch } from '../../../saved_searches';
import { DiscoverView } from './discover_view';
import { LastRecentlyAccessedView } from './last_recently_view';
import { IndexPatternView } from './index_pattern_view';
import { SectionNavigation } from './section_navigation';
import { HomeIndexPatternManagement } from './home_index_pattern_management';

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
  const [indexPatternEditorOpen, setIndexPatternEditorOpen] = useState<boolean>(false);
  const [reloadIndexPatterns, setReloadIndexPatterns] = useState<boolean>(true);

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
      <SectionNavigation items={savedSearchesToDisplay} itemsPerPage={DISPLAY_NUMBER_OF_ITEMS} />
    );
  };

  useEffect(() => {
    async function getRecentlyAccessed() {
      const sortFn = (a: SavedSearch, b: SavedSearch) => {
        const dateA = moment(a.accessed_at, moment.ISO_8601);
        const dateB = moment(b.accessed_at, moment.ISO_8601);
        if (moment(dateB).isAfter(dateA)) {
          return 1;
        }
        if (moment(dateA).isAfter(dateB)) {
          return -1;
        }
        return 0;
      };
      const lastRecentlyAccessedItems = cloneDeep(savedSearches);
      lastRecentlyAccessedItems.sort(sortFn);
      setRecentlyAccessed(lastRecentlyAccessedItems);
    }

    getRecentlyAccessed();
  }, [core, services, savedSearches]);

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
      setReloadIndexPatterns(false);
    }
    if (reloadIndexPatterns) {
      loadIndexPatterns();
    }
  }, [services, reloadIndexPatterns]);

  const lastRecentlyAccessedSection = () => {
    const recentlyAccessedItems: JSX.Element[] = [];
    recentlyAccessed.forEach((savedSearch) => {
      const { title, searchSource, id } = savedSearch;
      const indexPattern = searchSource.getField('index');
      recentlyAccessedItems.push(
        <EuiFlexItem>
          <LastRecentlyAccessedView
            id={id}
            title={title}
            indexPattern={indexPattern?.title || ''}
            onClick={() => goToDiscover(id)}
            lastAccessedAt={savedSearch.accessed_at}
          />
        </EuiFlexItem>
      );
    });
    return (
      <SectionNavigation items={recentlyAccessedItems} itemsPerPage={DISPLAY_NUMBER_OF_ITEMS} />
    );
  };

  const toggleIndexPatternEditor = () => {
    setIndexPatternEditorOpen(!indexPatternEditorOpen);
  };

  const addNewIndexPattern = (
    <EuiCard
      icon={<EuiIcon size="xxl" type="plusInCircle" />}
      title={'Add New'}
      description=""
      onClick={toggleIndexPatternEditor}
    >
      <HomeIndexPatternManagement
        services={services}
        editorOpen={indexPatternEditorOpen}
        onSave={() => {
          setIndexPatternEditorOpen(false);
          setReloadIndexPatterns(true);
        }}
      />
    </EuiCard>
  );

  const indexPatternsSection = () => {
    const displayElements = indexPatterns.map((indexPattern) => (
      <IndexPatternView indexPattern={indexPattern} services={services} />
    ));
    return (
      <EuiFlexGrid>
        <EuiFlexItem grow={1} style={{ height: '121px' }}>
          {addNewIndexPattern}
        </EuiFlexItem>
        <EuiFlexItem grow={9}>
          <SectionNavigation items={displayElements} itemsPerPage={DISPLAY_NUMBER_OF_ITEMS} />
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  };

  const goToDiscover = (id?: string) => {
    const { application } = services.core;
    if (!application) return;
    const path = id ? `#/view/${id}` : '#/';
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
