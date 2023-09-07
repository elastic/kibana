/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { SearchResponseWarnings } from './search_response_warnings';
import { searchResponseWarningsMock } from '../../__mocks__/search_response_warnings';

const interceptedWarnings = searchResponseWarningsMock.map((originalWarning, index) => ({
  originalWarning,
  action: originalWarning.type === 'shard_failure' ? <button>{`test${index}`}</button> : undefined,
}));

describe('SearchResponseWarnings', () => {
  it('renders "callout" correctly', () => {
    const component = mountWithIntl(
      <SearchResponseWarnings
        variant="callout"
        interceptedWarnings={interceptedWarnings}
        data-test-subj="test1"
      />
    );
    expect(component.render()).toMatchSnapshot();
  });

  it('renders "badge" correctly', () => {
    const component = mountWithIntl(
      <SearchResponseWarnings
        variant="badge"
        interceptedWarnings={interceptedWarnings}
        data-test-subj="test2"
      />
    );
    expect(component.render()).toMatchSnapshot();
  });

  it('renders "empty_prompt" correctly', () => {
    const component = mountWithIntl(
      <SearchResponseWarnings
        variant="empty_prompt"
        interceptedWarnings={interceptedWarnings}
        data-test-subj="test3"
      />
    );
    expect(component.render()).toMatchSnapshot();
  });
});
