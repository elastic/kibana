/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License
* 2.0 and the Server Side Public License, v 1; you may not use this file except
* in compliance with, at your election, the Elastic License 2.0 or the Server
* Side Public License, v 1.
*/

/* eslint-disable */
export const organizationEcs = {
  id: {
    dashed_name: 'organization-id',
    description: 'Unique identifier for the organization.',
    flat_name: 'organization.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'Unique identifier for the organization.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'organization-name',
    description: 'Organization name.',
    flat_name: 'organization.name',
    ignore_above: 1024,
    level: 'extended',
    multi_fields: [
      {
        flat_name: 'organization.name.text',
        name: 'text',
        type: 'match_only_text'
      }
    ],
    name: 'name',
    normalize: [],
    short: 'Organization name.',
    type: 'keyword'
  }
}