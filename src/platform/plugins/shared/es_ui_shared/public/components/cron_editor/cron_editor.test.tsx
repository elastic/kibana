/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { Frequency } from './types';
import { CronEditor } from './cron_editor';

describe('CronEditor', () => {
  ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'].forEach((unit) => {
    test(`is rendered with a ${unit} frequency`, () => {
      const { container } = renderWithI18n(
        <CronEditor
          fieldToPreferredValueMap={{}}
          frequency={unit as Frequency}
          cronExpression="0 10 * * * ?"
          onChange={() => {}}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('props', () => {
    describe('frequencyBlockList', () => {
      it('excludes the blocked frequencies from the frequency list', () => {
        renderWithI18n(
          <CronEditor
            frequencyBlockList={['HOUR', 'WEEK', 'YEAR']}
            fieldToPreferredValueMap={{}}
            frequency={'WEEK'}
            cronExpression="0 10 * * * ?"
            onChange={() => {}}
          />
        );

        const frequencySelect = screen.getByTestId('cronFrequencySelect');
        expect(frequencySelect).toHaveTextContent('minutedaymonth');
      });
    });

    describe('cronExpression', () => {
      it('sets the values of the fields', () => {
        renderWithI18n(
          <CronEditor
            fieldToPreferredValueMap={{}}
            frequency={'YEAR'}
            cronExpression="0 20 10 5 2 ?"
            onChange={() => {}}
          />
        );

        const monthSelect = screen.getByTestId(
          'cronFrequencyYearlyMonthSelect'
        ) as HTMLSelectElement;
        expect(monthSelect.value).toBe('2');

        const dateSelect = screen.getByTestId('cronFrequencyYearlyDateSelect') as HTMLSelectElement;
        expect(dateSelect.value).toBe('5');

        const hourSelect = screen.getByTestId('cronFrequencyYearlyHourSelect') as HTMLSelectElement;
        expect(hourSelect.value).toBe('10');

        const minuteSelect = screen.getByTestId(
          'cronFrequencyYearlyMinuteSelect'
        ) as HTMLSelectElement;
        expect(minuteSelect.value).toBe('20');
      });
    });

    describe('onChange', () => {
      it('is called when the frequency changes', async () => {
        const user = userEvent.setup();
        const onChangeSpy = jest.fn();
        renderWithI18n(
          <CronEditor
            fieldToPreferredValueMap={{}}
            frequency={'YEAR'}
            cronExpression="0 10 * * * ?"
            onChange={onChangeSpy}
          />
        );

        const frequencySelect = screen.getByTestId('cronFrequencySelect');
        await user.selectOptions(frequencySelect, 'MONTH');

        expect(onChangeSpy).toHaveBeenCalledWith({
          cronExpression: '0 0 0 1 * ?',
          fieldToPreferredValueMap: {},
          frequency: 'MONTH',
        });
      });

      it(`is called when a field's value changes`, async () => {
        const user = userEvent.setup();
        const onChangeSpy = jest.fn();
        renderWithI18n(
          <CronEditor
            fieldToPreferredValueMap={{}}
            frequency={'YEAR'}
            cronExpression="0 10 * * * ?"
            onChange={onChangeSpy}
          />
        );

        const minuteSelect = screen.getByTestId('cronFrequencyYearlyMinuteSelect');
        await user.selectOptions(minuteSelect, '40');

        expect(onChangeSpy).toHaveBeenCalledWith({
          cronExpression: '0 40 * * * ?',
          fieldToPreferredValueMap: { minute: '40' },
          frequency: 'YEAR',
        });
      });
    });
  });
});
