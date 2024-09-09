/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { includedListTypeEntry } from '../../../mocks/entry.mock';
import * as i18n from '../../translations';
import { EntryContent } from '.';
import { MockedShowValueListModal } from '../../../mocks/value_list_modal.mock';

describe('EntryContent', () => {
  it('should render a single value without AND when index is 0', () => {
    const wrapper = render(
      <EntryContent
        entry={includedListTypeEntry}
        index={0}
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('EntryContentSingleEntry')).toBeInTheDocument();
    expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('list_id');
  });
  it('should render a single value with AND when index is 1', () => {
    const wrapper = render(
      <EntryContent
        entry={includedListTypeEntry}
        index={1}
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('EntryContentSingleEntry')).toBeInTheDocument();
    expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('list_id');
    expect(wrapper.getByText(i18n.CONDITION_AND)).toBeInTheDocument();
  });
  it('should render a nested value', () => {
    const wrapper = render(
      <EntryContent
        entry={includedListTypeEntry}
        index={0}
        isNestedEntry
        dataTestSubj="EntryContent"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('EntryContentNestedEntry')).toBeInTheDocument();
    expect(wrapper.getByTestId('nstedEntryIcon')).toBeInTheDocument();
    expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('list_id');
    expect(wrapper).toMatchSnapshot();
  });
});
