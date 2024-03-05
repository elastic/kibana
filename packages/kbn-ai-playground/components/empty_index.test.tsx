/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { mount } from 'enzyme';

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import { EmptyIndex } from './empty_index';

describe('Empty state', () => {
  it('renders the empty state component', () => {
    const wrapper = mount(<EmptyIndex onCreateIndexClick={() => {}} />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });

  it('clicking in navigates to new index page', () => {
    const onCreateIndexClick = jest.fn();
    const wrapper = mount(<EmptyIndex onCreateIndexClick={onCreateIndexClick} />);

    // @ts-ignore
    wrapper.find(EuiButton).props().onClick();

    expect(onCreateIndexClick).toHaveBeenCalledTimes(1);
  });
});
