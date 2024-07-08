/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { FieldNameSearch, type FieldNameSearchProps } from './field_name_search';
import { render, screen, waitFor } from '@testing-library/react';

describe('UnifiedFieldList <FieldNameSearch />', () => {
  it('should render correctly', async () => {
    const props: FieldNameSearchProps = {
      nameFilter: '',
      onChange: jest.fn(),
      screenReaderDescriptionId: 'htmlId',
      'data-test-subj': 'searchInput',
    };
    render(<FieldNameSearch {...props} />);
    const input = screen.getByRole('searchbox', { name: 'Search field names' });
    expect(input).toHaveAttribute('aria-describedby', 'htmlId');
    userEvent.type(input, 'hey');
    await waitFor(() => expect(props.onChange).toHaveBeenCalledWith('hey'), { timeout: 256 });
    expect(props.onChange).toBeCalledTimes(1);
  });

  it('should accept the updates from the top', async () => {
    const FieldNameSearchWithWrapper = ({ defaultNameFilter = '' }) => {
      const [nameFilter, setNameFilter] = useState(defaultNameFilter);
      const props: FieldNameSearchProps = {
        nameFilter,
        onChange: jest.fn(),
        screenReaderDescriptionId: 'htmlId',
        'data-test-subj': 'searchInput',
      };
      return (
        <div>
          <button onClick={() => setNameFilter('that')}>update nameFilter</button>
          <FieldNameSearch {...props} />
        </div>
      );
    };
    render(<FieldNameSearchWithWrapper defaultNameFilter="this" />);
    expect(screen.getByRole('searchbox')).toHaveValue('this');
    const button = screen.getByRole('button', { name: 'update nameFilter' });
    userEvent.click(button);
    expect(screen.getByRole('searchbox')).toHaveValue('that');
  });
});
