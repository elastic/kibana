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

import expect from 'expect.js';
import { functionWrapper, testTable, fontStyle, containerStyle } from '@kbn/interpreter/test_utils';
import { render } from '../render';

const renderTable = {
  type: 'render',
  as: 'table',
  value: {
    datatable: testTable,
    font: fontStyle,
    paginate: false,
    perPage: 2,
  },
};

describe('render', () => {
  const fn = functionWrapper(render);

  it('returns a render', () => {
    const result = fn(renderTable, {
      as: 'debug',
      css: '".canvasRenderEl { background-color: red; }"',
      containerStyle: containerStyle,
    });

    expect(result).to.have.property('type', 'render');
  });

  describe('args', () => {
    describe('as', () => {
      it('sets what the element will render as', () => {
        const result = fn(renderTable, { as: 'debug' });
        expect(result).to.have.property('as', 'debug');
      });

      it('keep the original context.as if not specified', () => {
        const result = fn(renderTable);
        expect(result).to.have.property('as', renderTable.as);
      });
    });

    describe('css', () => {
      it('sets the custom CSS for the render elemnt', () => {
        const result = fn(renderTable, {
          css: '".canvasRenderEl { background-color: red; }"',
        });

        expect(result).to.have.property('css', '".canvasRenderEl { background-color: red; }"');
      });

      it('defaults to \'* > * {}\'', () => {
        const result = fn(renderTable);
        expect(result).to.have.property('css', '"* > * {}"');
      });
    });

    describe('containerStyle', () => {
      it('sets the containerStyler', () => {
        const result = fn(renderTable, { containerStyle: containerStyle });

        expect(result).to.have.property('containerStyle', containerStyle);
      });

      it('returns a render object with containerStyle as undefined', () => {
        const result = fn(renderTable);
        expect(result).to.have.property('containerStyle', undefined);
      });
    });
  });
});
