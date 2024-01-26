/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inject } from './inject';

test('Should return original state with by-reference embeddable state', () => {
  const linksByReferenceInput = {
    id: 'ea40fd4e-216c-49a7-917f-f733c8a2c817',
    type: 'links',
  };

  const references = [
    {
      name: 'panel_ea40fd4e-216c-49a7-917f-f733c8a2c817',
      type: 'links',
      id: '7f92d7d0-8e5f-11ec-9477-312c8a6de896',
    },
  ];

  expect(inject!(linksByReferenceInput, references)).toEqual(linksByReferenceInput);
});

test('Should inject refNames with by-value embeddable state', () => {
  const linksByValueInput = {
    id: 'c3937cf9-29be-43df-a4af-a4df742d7d35',
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
  };
  const references = [
    {
      name: 'link_fc7b8c70-2eb9-40b2-936d-457d1721a438_dashboard',
      type: 'dashboard',
      id: 'elastic_agent-1a4e7280-6b5e-11ed-98de-67bdecd21824',
    },
  ];

  expect(inject!(linksByValueInput, references)).toEqual({
    id: 'c3937cf9-29be-43df-a4af-a4df742d7d35',
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
  });
});
