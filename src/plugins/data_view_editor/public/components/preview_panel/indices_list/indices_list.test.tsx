/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

describe('IndicesList', () => {
  afterEach(() => {
    new Storage(localStorage).remove(PER_PAGE_STORAGE_KEY);
  });

  const commonProps: Omit<IndicesListProps, 'query'> = {
    indices,
    hasWarnings: false,
    onUpdateTitle: jest.fn(),
  };

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
    const component = shallow(<IndicesList {...commonProps} query="ki" />);

    expect(component).toMatchSnapshot();
  });

  it('should show a warning for the matches', () => {
    const component = shallow(<IndicesList {...commonProps} hasWarnings={true} query="ki" />);

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
