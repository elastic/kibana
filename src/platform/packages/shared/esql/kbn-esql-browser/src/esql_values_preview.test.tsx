/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { ESQLColumn } from '@kbn/es-types';
import { ESQLValuesPreview } from './esql_values_preview';

const noopProps = {
  updateQuery: jest.fn(),
};

const numericColumn: ESQLColumn = { name: 'bytes', type: 'long' };
const stringColumn: ESQLColumn = { name: 'os', type: 'keyword' };

describe('ESQLValuesPreview', () => {
  it('renders min/max stats for numeric columns when control type is range slider', () => {
    const { getByText, getByTestId } = render(
      <I18nProvider>
        <ESQLValuesPreview
          {...noopProps}
          values={[6, 7, 67]}
          columns={[numericColumn]}
          isRangeControl={true}
        />
      </I18nProvider>
    );

    expect(getByTestId('esqlValuesPreviewRange')).toBeInTheDocument();
    expect(getByText('6')).toBeInTheDocument();
    expect(getByText('67')).toBeInTheDocument();
  });

  it('renders a list of values for numeric columns when control type is options list', () => {
    const { getByTestId, queryByTestId } = render(
      <I18nProvider>
        <ESQLValuesPreview
          {...noopProps}
          values={[6, 7, 67]}
          columns={[numericColumn]}
          isRangeControl={false}
        />
      </I18nProvider>
    );

    expect(queryByTestId('esqlValuesPreviewRange')).not.toBeInTheDocument();
    expect(getByTestId('esqlValuesPreviewStrings')).toBeInTheDocument();
  });

  it('renders a list of values for string columns', () => {
    const { getByTestId } = render(
      <I18nProvider>
        <ESQLValuesPreview
          {...noopProps}
          values={[
            'some',
            'BODY',
            'once',
            'told me',
            'the',
            'world',
            'is',
            'gonna',
            'roll me',
            'i aint',
            'the sharpest tool',
            'in the shed',
            'she was lookin',
            'kinda dumb',
            'with her finger',
            'and her thumb',
            'in the SHAPE',
            'of. an. L.',
            'on her fore',
            'head',
          ]}
          columns={[stringColumn]}
        />
      </I18nProvider>
    );

    expect(getByTestId('esqlValuesPreviewStrings')).toBeInTheDocument();
  });

  describe('column picker (multiple columns returned)', () => {
    const multiColumns: ESQLColumn[] = [
      { name: 'col1', type: 'keyword' },
      { name: 'col2', type: 'keyword' },
    ];

    it('shows the warning and column picker button', () => {
      const { getByText, getByTestId } = render(
        <I18nProvider>
          <ESQLValuesPreview {...noopProps} values={[]} columns={multiColumns} />
        </I18nProvider>
      );

      expect(getByText('Query must return a single column')).toBeInTheDocument();
      expect(getByTestId('chooseColumnBtn')).toBeInTheDocument();
    });

    it('should render a search input and a list when the column picker is opened', async () => {
      const user = userEvent.setup();
      const { findByTestId } = render(
        <I18nProvider>
          <ESQLValuesPreview {...noopProps} values={[]} columns={multiColumns} />
        </I18nProvider>
      );

      await user.click(await findByTestId('chooseColumnBtn'));

      expect(await findByTestId('selectableColumnSearch')).toBeInTheDocument();
      expect(await findByTestId('selectableColumnList')).toBeInTheDocument();
    });

    it('should update the list when there is text in the search input', async () => {
      const user = userEvent.setup();
      const { findByTestId } = render(
        <I18nProvider>
          <ESQLValuesPreview {...noopProps} values={[]} columns={multiColumns} />
        </I18nProvider>
      );

      await user.click(await findByTestId('chooseColumnBtn'));
      const input = await findByTestId('selectableColumnSearch');

      fireEvent.change(input, { target: { value: 'col2' } });

      const list = await findByTestId('selectableColumnList');
      const listItems = list.querySelector('li');
      expect(listItems).toHaveTextContent('col2');
    });

    it('should call updateQuery when a column is selected', async () => {
      const updateQuery = jest.fn();
      const { getByTestId, getByText } = render(
        <I18nProvider>
          <ESQLValuesPreview
            {...noopProps}
            updateQuery={updateQuery}
            values={[]}
            columns={multiColumns}
          />
        </I18nProvider>
      );

      await act(async () => {
        fireEvent.click(getByTestId('chooseColumnBtn'));
      });
      await act(async () => {
        fireEvent.click(getByText('col2'));
      });

      expect(updateQuery).toHaveBeenCalledWith('col2');
    });
  });
});
