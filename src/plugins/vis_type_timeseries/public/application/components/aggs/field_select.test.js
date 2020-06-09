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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { FieldSelect } from './field_select';
import { EuiComboBox } from '@elastic/eui';
import {
  SCRIPTED_FIELD_VALUE,
  FIELDS,
  INDEX_PATTERN,
  UI_RESTRICTIONS,
} from '../../../../common/constants';

describe('FieldSelect', () => {
  it('should have scripted field', () => {
    const wrapper = mountWithIntl(
      <div>
        <FieldSelect
          includeScript
          fields={FIELDS}
          type="avg"
          restrict={['number']}
          indexPattern={INDEX_PATTERN}
          value={null}
          onChange={jest.fn()}
          uiRestrictions={UI_RESTRICTIONS}
        />
      </div>
    );
    expect(wrapper.find(EuiComboBox).props().options).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "special ",
          "options": Array [
            Object {
              "label": "Script",
              "value": "__SCRIPT__",
            },
          ],
        },
        Object {
          "label": "number",
          "options": Array [
            Object {
              "label": "system.cpu.user.pct",
              "value": "system.cpu.user.pct",
            },
          ],
        },
      ]
    `);
  });
  it('should have scripted field selected', () => {
    const wrapper = mountWithIntl(
      <div>
        <FieldSelect
          includeScript
          fields={FIELDS}
          type="avg"
          restrict={['number']}
          indexPattern={INDEX_PATTERN}
          value={SCRIPTED_FIELD_VALUE}
          onChange={jest.fn()}
          uiRestrictions={UI_RESTRICTIONS}
        />
      </div>
    );
    expect(wrapper.find(EuiComboBox).props().selectedOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "Script",
          "value": "__SCRIPT__",
        },
      ]
    `);
  });
  it('should not have scripted field', () => {
    const wrapper = mountWithIntl(
      <div>
        <FieldSelect
          fields={FIELDS}
          type="avg"
          restrict={['number']}
          indexPattern={INDEX_PATTERN}
          value={SCRIPTED_FIELD_VALUE}
          onChange={jest.fn()}
          uiRestrictions={UI_RESTRICTIONS}
        />
      </div>
    );
    expect(wrapper.find(EuiComboBox).props().options).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "number",
          "options": Array [
            Object {
              "label": "system.cpu.user.pct",
              "value": "system.cpu.user.pct",
            },
          ],
        },
      ]
    `);
  });
});
