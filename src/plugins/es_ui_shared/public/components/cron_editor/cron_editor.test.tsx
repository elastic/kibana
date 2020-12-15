/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import sinon from 'sinon';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithI18nProvider } from '@kbn/test/jest';

import { Frequency } from './types';
import { CronEditor } from './cron_editor';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

describe('CronEditor', () => {
  ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'].forEach((unit) => {
    test(`is rendered with a ${unit} frequency`, () => {
      const component = mountWithI18nProvider(
        <CronEditor
          fieldToPreferredValueMap={{}}
          frequency={unit as Frequency}
          cronExpression="0 10 * * * ?"
          onChange={() => {}}
        />
      );

      expect(component).toMatchSnapshot();
    });
  });

  describe('props', () => {
    describe('frequencyBlockList', () => {
      it('excludes the blocked frequencies from the frequency list', () => {
        const component = mountWithI18nProvider(
          <CronEditor
            frequencyBlockList={['HOUR', 'WEEK', 'YEAR']}
            fieldToPreferredValueMap={{}}
            frequency={'WEEK'}
            cronExpression="0 10 * * * ?"
            onChange={() => {}}
          />
        );

        const frequencySelect = findTestSubject(component, 'cronFrequencySelect');
        expect(frequencySelect.text()).toBe('minutedaymonth');
      });
    });

    describe('cronExpression', () => {
      it('sets the values of the fields', () => {
        const component = mountWithI18nProvider(
          <CronEditor
            fieldToPreferredValueMap={{}}
            frequency={'YEAR'}
            cronExpression="0 20 10 5 2 ?"
            onChange={() => {}}
          />
        );

        const monthSelect = findTestSubject(component, 'cronFrequencyYearlyMonthSelect');
        expect(monthSelect.props().value).toBe('2');

        const dateSelect = findTestSubject(component, 'cronFrequencyYearlyDateSelect');
        expect(dateSelect.props().value).toBe('5');

        const hourSelect = findTestSubject(component, 'cronFrequencyYearlyHourSelect');
        expect(hourSelect.props().value).toBe('10');

        const minuteSelect = findTestSubject(component, 'cronFrequencyYearlyMinuteSelect');
        expect(minuteSelect.props().value).toBe('20');
      });
    });

    describe('onChange', () => {
      it('is called when the frequency changes', () => {
        const onChangeSpy = sinon.spy();
        const component = mountWithI18nProvider(
          <CronEditor
            fieldToPreferredValueMap={{}}
            frequency={'YEAR'}
            cronExpression="0 10 * * * ?"
            onChange={onChangeSpy}
          />
        );

        const frequencySelect = findTestSubject(component, 'cronFrequencySelect');
        frequencySelect.simulate('change', { target: { value: 'MONTH' } });

        sinon.assert.calledWith(onChangeSpy, {
          cronExpression: '0 0 0 1 * ?',
          fieldToPreferredValueMap: {},
          frequency: 'MONTH',
        });
      });

      it(`is called when a field's value changes`, () => {
        const onChangeSpy = sinon.spy();
        const component = mountWithI18nProvider(
          <CronEditor
            fieldToPreferredValueMap={{}}
            frequency={'YEAR'}
            cronExpression="0 10 * * * ?"
            onChange={onChangeSpy}
          />
        );

        const minuteSelect = findTestSubject(component, 'cronFrequencyYearlyMinuteSelect');
        minuteSelect.simulate('change', { target: { value: '40' } });

        sinon.assert.calledWith(onChangeSpy, {
          cronExpression: '0 40 * * * ?',
          fieldToPreferredValueMap: { minute: '40' },
          frequency: 'YEAR',
        });
      });
    });
  });
});
