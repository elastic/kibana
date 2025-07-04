/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { IndicesList, IndicesListProps, PER_PAGE_STORAGE_KEY } from './indices_list';
import { shallow } from 'enzyme';
import { MatchedItem } from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

const indices = [
  { name: 'kibana', tags: [] },
  { name: 'es', tags: [] },
] as unknown as MatchedItem[];

const similarIndices = [
  { name: 'logstash', tags: [] },
  { name: 'some_logs', tags: [] },
] as unknown as MatchedItem[];

describe('IndicesList', () => {
  const commonProps: Omit<IndicesListProps, 'query'> = {
    indices,
    isExactMatch: jest.fn(() => false),
  };

  afterEach(() => {
    new Storage(localStorage).remove(PER_PAGE_STORAGE_KEY);
  });

  it('should render normally', () => {
    const component = shallow(<IndicesList {...commonProps} query="" />);

    expect(component).toMatchSnapshot();
  });

  it('should change pages', () => {
    const component = shallow(<IndicesList {...commonProps} query="" />);

    const instance = component.instance() as IndicesList;

    component.setState({ perPage: 1 });
    instance.onChangePage(1);
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should change per page', () => {
    const component = shallow(<IndicesList {...commonProps} query="" />);

    const instance = component.instance() as IndicesList;
    instance.onChangePerPage(1);
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should highlight the query in the matches', () => {
    const component = shallow(
      <IndicesList
        {...commonProps}
        query="es,ki"
        isExactMatch={(indexName) => indexName === 'es'}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should highlight fully when an exact match', () => {
    const component = shallow(
      <IndicesList
        {...commonProps}
        indices={similarIndices}
        query="logs*"
        isExactMatch={(indexName) => indexName === 'some_logs'}
      />
    );

    expect(component).toMatchSnapshot();
  });

  describe('updating props', () => {
    it('should render all new indices', () => {
      const component = shallow(<IndicesList {...commonProps} query="" />);

      const moreIndices = [
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
      ];

      component.setProps({ indices: moreIndices });
      component.update();
      expect(component).toMatchSnapshot();
    });
  });
});
