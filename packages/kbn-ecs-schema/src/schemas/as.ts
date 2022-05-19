/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const asEcs = {
  number: {
    dashed_name: 'as-number',
    description:
      'Unique number allocated to the autonomous system. The autonomous system number (ASN) uniquely identifies each network on the Internet.',
    example: 15169,
    flat_name: 'as.number',
    level: 'extended',
    name: 'number',
    normalize: [],
    short: 'Unique number allocated to the autonomous system.',
    type: 'long',
  },
  organization: {
    name: {
      dashed_name: 'as-organization-name',
      description: 'Organization name.',
      example: 'Google LLC',
      flat_name: 'as.organization.name',
      ignore_above: 1024,
      level: 'extended',
      multi_fields: [
        {
          flat_name: 'as.organization.name.text',
          name: 'text',
          type: 'match_only_text',
        },
      ],
      name: 'organization.name',
      normalize: [],
      short: 'Organization name.',
      type: 'keyword',
    },
  },
};
