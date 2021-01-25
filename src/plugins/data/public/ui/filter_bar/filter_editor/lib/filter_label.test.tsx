/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
