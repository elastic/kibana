/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { FilterEditor, Props } from '.';
import React from 'react';

jest.mock('../../../../../kibana_react/public', () => {
  const original = jest.requireActual('../../../../../kibana_react/public');

  return {
    ...original,
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        value={props.value}
        onChange={async (eve: any) => {
          props.onChange(eve.target.value);
        }}
      />
    ),
  };
});

describe('<FilterEditor />', () => {
  describe('writing query dsl', () => {
    let testBed: TestBed;

    beforeEach(async () => {
      const defaultProps: Omit<Props, 'intl'> = {
        filter: {
          meta: {
            type: 'phase',
          } as any,
        },
        indexPatterns: [],
        onCancel: jest.fn(),
        onSubmit: jest.fn(),
      };
      testBed = await registerTestBed(FilterEditor, { defaultProps })();
    });

    it('requires a non-empty JSON object', async () => {
      const { exists, find } = testBed;

      expect(exists('customEditorInput')).toBe(true);

      find('customEditorInput').simulate('change', {
        target: { value: '{ }' },
      });
      expect(find('saveFilter').props().disabled).toBe(true);

      find('customEditorInput').simulate('change', {
        target: { value: '{' }, // bad JSON
      });
      expect(find('saveFilter').props().disabled).toBe(true);

      find('customEditorInput').simulate('change', {
        target: { value: '{ "something": "here" }' },
      });

      expect(find('saveFilter').props().disabled).toBe(false);
    });
  });
});
