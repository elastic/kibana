/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { act, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { requireTimestampOptionValidator, TimestampField } from './timestamp_field';
import { Form, useForm } from '../../shared_imports';
import type { TimestampOption } from '../../types';
import { matchedIndiciesDefault } from '../../data_view_editor_service';

type ValidatorArgs = Parameters<ReturnType<typeof requireTimestampOptionValidator>['validator']>[0];

const validate = (options: TimestampOption[], value?: { label: string; value: string }) =>
  requireTimestampOptionValidator(options).validator({ value } as unknown as ValidatorArgs);

type TimestampFieldValue = Pick<TimestampOption, 'display'> & { value: string };

const TimestampFieldInForm = ({
  timestampField,
  ...props
}: ComponentProps<typeof TimestampField> & {
  // the saved timestamp field the form is prefilled with when editing a data view
  timestampField?: TimestampFieldValue;
}) => {
  const { form } = useForm({
    defaultValue: timestampField
      ? { timestampField: { label: timestampField.display, value: timestampField.value } }
      : undefined,
  });
  return (
    <Form form={form}>
      <TimestampField {...props} />
    </Form>
  );
};

const renderTimestampField = async ({
  options = [],
  isLoadingOptions = false,
  optionsError,
  hasMatchedIndices = true,
  timestampField,
}: {
  options?: TimestampOption[];
  isLoadingOptions?: boolean;
  optionsError?: Error;
  hasMatchedIndices?: boolean;
  timestampField?: TimestampFieldValue;
} = {}) => {
  const options$ = new BehaviorSubject(options);
  const isLoadingOptions$ = new BehaviorSubject(isLoadingOptions);
  const optionsError$ = new BehaviorSubject(optionsError);
  const matchedIndices$ = of({
    ...matchedIndiciesDefault,
    exactMatchedIndices: hasMatchedIndices
      ? [{ name: 'tracks', tags: [], item: { name: 'tracks' } }]
      : [],
  });

  await act(async () => {
    renderWithI18n(
      <TimestampFieldInForm
        options$={options$}
        isLoadingOptions$={isLoadingOptions$}
        matchedIndices$={matchedIndices$}
        optionsError$={optionsError$}
        timestampField={timestampField}
      />
    );
  });

  return { options$, isLoadingOptions$, optionsError$ };
};

const getSelectedTimestampField = () =>
  (screen.getByTestId('comboBoxSearchInput') as HTMLInputElement).value;

describe('TimestampField', () => {
  describe('requireTimestampOptionValidator', () => {
    const options: TimestampOption[] = [
      { display: 'a', fieldName: 'a' },
      { display: 'a', fieldName: 'b' },
    ];

    it('should pass without a value when there are no options', async () => {
      expect(await validate([])).toBeUndefined();
    });

    it('should fail without a value when there are options', async () => {
      expect(await validate(options)).toBeDefined();
    });

    it('should pass when the value is one of the options', async () => {
      expect(await validate(options, { label: 'a', value: 'a' })).toBeUndefined();
    });

    it('should fail when the value is not one of the options', async () => {
      expect(await validate(options, { label: 'c', value: 'c' })).toBeDefined();
    });
  });

  describe('help text', () => {
    const optionsError = new Error('Fields API is unavailable');

    it('should show the error message when the field list request failed', async () => {
      await renderTimestampField({ optionsError });

      expect(screen.getByTestId('timestampFieldError')).toHaveTextContent(
        "Couldn't retrieve the list of timestamp fields: Fields API is unavailable"
      );
      expect(
        screen.queryByText('No matching data stream, index, or index alias has a timestamp field.')
      ).not.toBeInTheDocument();
    });

    it('should hide the error while the options are loading', async () => {
      await renderTimestampField({ optionsError, isLoadingOptions: true });

      expect(screen.getByTestId('timestampField')).toBeInTheDocument();
      expect(screen.queryByTestId('timestampFieldError')).not.toBeInTheDocument();
    });

    it('should replace the error with the regular help text once options are loaded', async () => {
      const { options$, optionsError$ } = await renderTimestampField({ optionsError });
      expect(screen.getByTestId('timestampFieldError')).toBeInTheDocument();

      await act(async () => {
        optionsError$.next(undefined);
        options$.next([{ display: '@timestamp', fieldName: '@timestamp' }]);
      });

      expect(screen.queryByTestId('timestampFieldError')).not.toBeInTheDocument();
      expect(
        screen.getByText('Select a timestamp field for use with the global time filter.')
      ).toBeInTheDocument();
    });
  });

  describe('saved timestamp field which is missing in the list', () => {
    const missingTimestampField: TimestampFieldValue = {
      display: 'ghost_timestamp',
      value: 'ghost_timestamp',
    };
    const options: TimestampOption[] = [
      { display: '@timestamp', fieldName: '@timestamp' },
      { display: 'utc_time', fieldName: 'utc_time' },
    ];
    it('should warn about the missing field instead of replacing it with @timestamp', async () => {
      await renderTimestampField({ options, timestampField: missingTimestampField });

      expect(screen.getByTestId('timestampFieldNotFoundCallout')).toHaveTextContent(
        'This data view uses ghost_timestamp as its timestamp field, but no matching data stream, index, or index alias has that field.'
      );
      expect(getSelectedTimestampField()).toBe('');
    });

    it('should not warn while the options are loading', async () => {
      const { isLoadingOptions$ } = await renderTimestampField({
        options,
        isLoadingOptions: true,
        timestampField: missingTimestampField,
      });

      expect(screen.queryByTestId('timestampFieldNotFoundCallout')).not.toBeInTheDocument();

      await act(async () => {
        isLoadingOptions$.next(false);
      });

      expect(screen.getByTestId('timestampFieldNotFoundCallout')).toBeInTheDocument();
      expect(getSelectedTimestampField()).toBe('');
    });

    it.each([
      {
        state: 'the field list request failed',
        renderOptions: { optionsError: new Error('Fields API is unavailable') },
      },
      { state: 'there are no matching indices', renderOptions: { hasMatchedIndices: false } },
    ])('should not warn when $state', async ({ renderOptions }) => {
      await renderTimestampField({ ...renderOptions, timestampField: missingTimestampField });

      expect(screen.queryByTestId('timestampFieldNotFoundCallout')).not.toBeInTheDocument();
    });

    it('should not warn when the saved field is in the list', async () => {
      await renderTimestampField({
        options,
        timestampField: { display: 'utc_time', value: 'utc_time' },
      });

      expect(screen.queryByTestId('timestampFieldNotFoundCallout')).not.toBeInTheDocument();
      expect(getSelectedTimestampField()).toBe('utc_time');
    });

    it('should not warn for a data view without a time field when the matching indices have no date fields', async () => {
      await renderTimestampField({
        options: [],
        timestampField: { display: "--- I don't want to use the time filter ---", value: '' },
      });

      expect(screen.queryByTestId('timestampFieldNotFoundCallout')).not.toBeInTheDocument();
    });

    it('should still auto-select @timestamp when no timestamp field was saved', async () => {
      await renderTimestampField({ options });

      expect(screen.queryByTestId('timestampFieldNotFoundCallout')).not.toBeInTheDocument();
      expect(getSelectedTimestampField()).toBe('@timestamp');
    });
  });
});
