/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test/jest';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { esHits } from '../../../__mocks__/es_hits';
import { createFilterManagerMock } from '../../../../../data/public/query/filter_manager/filter_manager.mock';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { DiscoverServices } from '../../../build_services';
import { DocViewsRegistry } from '../../doc_views/doc_views_registry';
import { setDocViewsRegistry } from '../../../kibana_services';
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';

describe('Discover flyout', function () {
  setDocViewsRegistry(new DocViewsRegistry());

  const getProps = () => {
    const onClose = jest.fn();
    const services = {
      filterManager: createFilterManagerMock(),
      addBasePath: (path: string) => `/base${path}`,
    } as unknown as DiscoverServices;

    return {
      columns: ['date'],
      indexPattern: indexPatternMock,
      hit: esHits[0],
      hits: esHits,
      onAddColumn: jest.fn(),
      onClose,
      onFilter: jest.fn(),
      onRemoveColumn: jest.fn(),
      services,
      setExpandedDoc: jest.fn(),
    };
  };

  it('should be rendered correctly using an index pattern without timefield', async () => {
    const props = getProps();
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);

    const url = findTestSubject(component, 'docTableRowAction').prop('href');
    expect(url).toMatchInlineSnapshot(`"/base/app/discover#/doc/the-index-pattern-id/i?id=1"`);
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('should be rendered correctly using an index pattern with timefield', async () => {
    const props = getProps();
    props.indexPattern = indexPatternWithTimefieldMock;
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);

    const actions = findTestSubject(component, 'docTableRowAction');
    expect(actions.length).toBe(2);
    expect(actions.first().prop('href')).toMatchInlineSnapshot(
      `"/base/app/discover#/doc/index-pattern-with-timefield-id/i?id=1"`
    );
    expect(actions.last().prop('href')).toMatchInlineSnapshot(
      `"/base/app/discover#/context/index-pattern-with-timefield-id/1?_g=(filters:!())&_a=(columns:!(date),filters:!())"`
    );
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('displays document navigation when there is more than 1 doc available', async () => {
    const props = getProps();
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    const docNav = findTestSubject(component, 'dscDocNavigation');
    expect(docNav.length).toBeTruthy();
  });

  it('displays no document navigation when there are 0 docs available', async () => {
    const props = getProps();
    props.hits = [];
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    const docNav = findTestSubject(component, 'dscDocNavigation');
    expect(docNav.length).toBeFalsy();
  });

  it('displays no document navigation when the expanded doc is not part of the given docs', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const props = getProps();
    props.hits = [
      {
        _index: 'new',
        _id: '1',
        _score: 1,
        _type: '_doc',
        _source: { date: '2020-20-01T12:12:12.123', message: 'test1', bytes: 20 },
      },
      {
        _index: 'new',
        _id: '2',
        _score: 1,
        _type: '_doc',
        _source: { date: '2020-20-01T12:12:12.124', name: 'test2', extension: 'jpg' },
      },
    ];
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    const docNav = findTestSubject(component, 'dscDocNavigation');
    expect(docNav.length).toBeFalsy();
  });

  it('allows you to navigate to the next doc, if expanded doc is the first', async () => {
    // scenario: you've expanded a doc, and in the next request different docs where fetched
    const props = getProps();
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    findTestSubject(component, 'pagination-button-next').simulate('click');
    // we selected 1, so we'd expect 2
    expect(props.setExpandedDoc.mock.calls[0][0]._id).toBe('2');
  });

  it('doesnt allow you to navigate to the previous doc, if expanded doc is the first', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const props = getProps();
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    findTestSubject(component, 'pagination-button-previous').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('doesnt allow you to navigate to the next doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const props = getProps();
    props.hit = props.hits[props.hits.length - 1];
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    findTestSubject(component, 'pagination-button-next').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('allows you to navigate to the previous doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const props = getProps();
    props.hit = props.hits[props.hits.length - 1];
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    findTestSubject(component, 'pagination-button-previous').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(1);
    expect(props.setExpandedDoc.mock.calls[0][0]._id).toBe('4');
  });

  it('allows navigating with arrow keys through documents', () => {
    const props = getProps();
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ _id: '2' }));
    component.setProps({ ...props, hit: props.hits[1] });
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ _id: '1' }));
  });

  it('should not navigate with keypresses when already at the border of documents', () => {
    const props = getProps();
    const component = mountWithIntl(<DiscoverGridFlyout {...props} />);
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
    component.setProps({ ...props, hit: props.hits[props.hits.length - 1] });
    findTestSubject(component, 'docTableDetailsFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });
});
