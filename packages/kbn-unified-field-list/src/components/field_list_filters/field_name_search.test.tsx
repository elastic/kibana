/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { FieldNameSearch, type FieldNameSearchProps } from './field_name_search';

describe('UnifiedFieldList <FieldNameSearch />', () => {
  it('should render correctly', async () => {
    const props: FieldNameSearchProps = {
      nameFilter: '',
      onChange: jest.fn(),
      screenReaderDescriptionId: 'htmlId',
      'data-test-subj': 'searchInput',
    };
    const wrapper = mountWithIntl(<FieldNameSearch {...props} />);
    expect(wrapper.find('input').prop('aria-describedby')).toBe('htmlId');

    act(() => {
      wrapper.find('input').simulate('change', {
        target: { value: 'hi' },
      });
    });

    expect(props.onChange).toBeCalledWith('hi');
  });

  it('should update correctly', async () => {
    const props: FieldNameSearchProps = {
      nameFilter: 'this',
      onChange: jest.fn(),
      screenReaderDescriptionId: 'htmlId',
      'data-test-subj': 'searchInput',
    };
    const wrapper = mountWithIntl(<FieldNameSearch {...props} />);

    expect(wrapper.find('input').prop('value')).toBe('this');

    wrapper.setProps({
      nameFilter: 'that',
    });

    expect(wrapper.find('input').prop('value')).toBe('that');

    expect(props.onChange).not.toBeCalled();
  });
});
