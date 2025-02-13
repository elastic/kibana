/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSetting, uiSetting } from '../ui_setting';

function createUiSetting(value: unknown, key = 'something'): UiSetting {
  return {
    key,
    value,
    type: 'ui_setting',
  };
}

describe('uiSetting', () => {
  describe('to', () => {
    describe('render', () => {
      it.each`
        value          | expected
        ${{ a: 'b' }}  | ${JSON.stringify({ a: 'b' })}
        ${null}        | ${''}
        ${'something'} | ${'something'}
      `('should render "$value" as "$expected"', ({ expected, value }) => {
        expect(uiSetting.to?.render(createUiSetting(value), {})).toHaveProperty(
          'value.text',
          expected
        );
      });
    });

    describe('datatable', () => {
      it('should use parameter name as a datatable column', () => {
        expect(uiSetting.to?.datatable(createUiSetting('value', 'column'), {})).toHaveProperty(
          'columns.0',
          expect.objectContaining({ id: 'column', name: 'column' })
        );
      });

      it.each`
        value          | type
        ${null}        | ${'null'}
        ${undefined}   | ${'null'}
        ${'something'} | ${'string'}
        ${['123']}     | ${'string'}
        ${123}         | ${'number'}
        ${[123]}       | ${'number'}
        ${true}        | ${'boolean'}
        ${{ a: 'b' }}  | ${'object'}
        ${[]}          | ${'unknown'}
      `('should determine $type type', ({ value, type }) => {
        expect(uiSetting.to?.datatable(createUiSetting(value, 'column'), {})).toHaveProperty(
          'columns.0.meta.type',
          type
        );
      });

      it('should put a value into a row', () => {
        expect(uiSetting.to?.datatable(createUiSetting('value'), {})).toHaveProperty(
          'rows.0.something',
          'value'
        );
      });

      it('should put an array value into multiple rows', () => {
        expect(uiSetting.to?.datatable(createUiSetting(['a', 'b']), {})).toHaveProperty(
          'rows',
          expect.arrayContaining([
            expect.objectContaining({ something: 'a' }),
            expect.objectContaining({ something: 'b' }),
          ])
        );
      });
    });
  });
});
