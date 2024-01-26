/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extract } from './extract';

test('Should return original state and empty references with by-reference embeddable state', () => {
  const linksByReferenceInput = {
    id: '2192e502-0ec7-4316-82fb-c9bbf78525c4',
    type: 'links',
  };

  expect(extract!(linksByReferenceInput)).toEqual({
    state: linksByReferenceInput,
    references: [],
  });
});

test('Should update state with refNames with by-value embeddable state', () => {
  const linksByValueInput = {
    id: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20',
    attributes: {
      links: [
        {
          type: 'dashboardLink',
          id: 'fc7b8c70-2eb9-40b2-936d-457d1721a438',
          destination: 'elastic_agent-1a4e7280-6b5e-11ed-98de-67bdecd21824',
          order: 0,
        },
      ],
      layout: 'horizontal',
    },
    type: 'links',
  };

  expect(extract!(linksByValueInput)).toEqual({
    references: [
      {
        name: 'link_fc7b8c70-2eb9-40b2-936d-457d1721a438_dashboard',
        type: 'dashboard',
        id: 'elastic_agent-1a4e7280-6b5e-11ed-98de-67bdecd21824',
      },
    ],
    state: {
      id: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20',
      attributes: {
        links: [
          {
            type: 'dashboardLink',
            id: 'fc7b8c70-2eb9-40b2-936d-457d1721a438',
            destinationRefName: 'link_fc7b8c70-2eb9-40b2-936d-457d1721a438_dashboard',
            order: 0,
          },
        ],
        layout: 'horizontal',
      },
      type: 'links',
    },
  });
});
