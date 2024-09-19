/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test/jest';
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';
import { esHits } from '../../../../../__mocks__/es_hits';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import { GetStateReturn } from '../../services/discover_state';
import { DataDocuments$ } from '../../services/use_saved_search';
import { discoverServiceMock } from '../../../../../__mocks__/services';
import { FetchStatus } from '../../../../types';
import { DiscoverDocuments } from './discover_documents';
import { ElasticSearchHit } from '../../../../doc_views/doc_views_types';
import { indexPatternMock } from '../../../../../__mocks__/index_pattern';

setHeaderActionMenuMounter(jest.fn());

function getProps(fetchStatus: FetchStatus, hits: ElasticSearchHit[]) {
  const services = discoverServiceMock;
  services.data.query.timefilter.timefilter.getTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const documents$ = new BehaviorSubject({
    fetchStatus,
    result: hits,
  }) as DataDocuments$;

  return {
    expandedDoc: undefined,
    indexPattern: indexPatternMock,
    onAddFilter: jest.fn(),
    savedSearch: savedSearchMock,
    documents$,
    searchSource: documents$,
    services,
    setExpandedDoc: jest.fn(),
    state: { columns: [] },
    stateContainer: {} as GetStateReturn,
    navigateTo: jest.fn(),
  };
}

describe('Discover documents layout', () => {
  test('render loading when loading and no documents', () => {
    const component = mountWithIntl(<DiscoverDocuments {...getProps(FetchStatus.LOADING, [])} />);
    expect(component.find('.dscDocuments__loading').exists()).toBeTruthy();
    expect(component.find('.dscTable').exists()).toBeFalsy();
  });

  test('render complete when loading but documents were already fetched', () => {
    const component = mountWithIntl(
      <DiscoverDocuments {...getProps(FetchStatus.LOADING, esHits as ElasticSearchHit[])} />
    );
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
  });

  test('render complete', () => {
    const component = mountWithIntl(
      <DiscoverDocuments {...getProps(FetchStatus.COMPLETE, esHits as ElasticSearchHit[])} />
    );
    expect(component.find('.dscDocuments__loading').exists()).toBeFalsy();
    expect(component.find('.dscTable').exists()).toBeTruthy();
  });
});
