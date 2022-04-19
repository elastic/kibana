/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import FilterLabel from './filter_label';
import { render } from '@testing-library/react';
import { phraseFilter } from '@kbn/data-plugin/common/stubs';

test('alias', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: 'geo.coordinates in US',
    },
  };
  const { container } = render(<FilterLabel filter={filter} />);
  expect(container).toMatchSnapshot();
});

test('field custom label', () => {
  const filter = {
    ...phraseFilter,
    meta: {
      ...phraseFilter.meta,
      alias: 'geo.coordinates in US',
    },
  };
  const { container } = render(<FilterLabel filter={filter} fieldLabel="test label" />);
  expect(container).toMatchSnapshot();
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
  expect(container).toMatchSnapshot();
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
  expect(container).toMatchSnapshot();
});

test('warning', () => {
  const { container } = render(<FilterLabel filter={phraseFilter} valueLabel={'Warning'} />);
  expect(container).toMatchSnapshot();
});

test('error', () => {
  const { container } = render(<FilterLabel filter={phraseFilter} valueLabel={'Error'} />);
  expect(container).toMatchSnapshot();
});
