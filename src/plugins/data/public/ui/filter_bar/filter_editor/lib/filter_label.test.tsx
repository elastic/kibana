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
import FilterLabel from './filter_label';
import { render } from '@testing-library/react';
import { phraseFilter } from '../../../../stubs';

test('alias', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: 'geo.coordinates in US',
    },
  };
  const { container } = render(<FilterLabel filter={filter} />);
  expect(container).toMatchInlineSnapshot(`
    <div>
      
      geo.coordinates in US
    </div>
  `);
});

test('negated alias', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: 'geo.coordinates in US',
      negate: true,
    },
  };
  const { container } = render(<FilterLabel filter={filter} />);
  expect(container).toMatchInlineSnapshot(`
    <div>
      <span
        class="euiTextColor euiTextColor--danger"
      >
         NOT 
      </span>
      geo.coordinates in US
    </div>
  `);
});

test('alias with warning status', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: 'geo.coordinates in US',
      negate: true,
    },
  };
  const { container } = render(
    <FilterLabel filter={filter} valueLabel={'Warning'} filterLabelStatus={'warn'} />
  );
  expect(container).toMatchInlineSnapshot(`
    <div>
      <span
        class="euiTextColor euiTextColor--danger"
      >
         NOT 
      </span>
      geo.coordinates in US
      : 
      <span
        class="globalFilterLabel__value"
      >
        Warning
      </span>
    </div>
  `);
});

test('alias with error status', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: 'geo.coordinates in US',
      negate: true,
    },
  };
  const { container } = render(
    <FilterLabel filter={filter} valueLabel={'Error'} filterLabelStatus={'error'} />
  );
  expect(container).toMatchInlineSnapshot(`
    <div>
      <span
        class="euiTextColor euiTextColor--danger"
      >
         NOT 
      </span>
      geo.coordinates in US
      : 
      <span
        class="globalFilterLabel__value"
      >
        Error
      </span>
    </div>
  `);
});

test('warning', () => {
  const { container } = render(<FilterLabel filter={phraseFilter} valueLabel={'Warning'} />);
  expect(container).toMatchInlineSnapshot(`
    <div>
      
      machine.os
      : 
      <span
        class="globalFilterLabel__value"
      >
        Warning
      </span>
    </div>
  `);
});

test('error', () => {
  const { container } = render(<FilterLabel filter={phraseFilter} valueLabel={'Error'} />);
  expect(container).toMatchInlineSnapshot(`
    <div>
      
      machine.os
      : 
      <span
        class="globalFilterLabel__value"
      >
        Error
      </span>
    </div>
  `);
});
