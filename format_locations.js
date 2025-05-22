/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const data = {
  aggregations: {
    locations: {
      buckets: [
        {
          key: {
            id: 'asia-northeast1-a',
            name: 'Asia/Pacific - Japan',
          },
          doc_count: 678,
        },
        {
          key: {
            id: 'asia-south1-a',
            name: 'Asia/Pacific - India',
          },
          doc_count: 560,
        },
        {
          key: {
            id: 'asia-southeast1-a',
            name: 'Asia/Pacific - Singapore',
          },
          doc_count: 679,
        },
        {
          key: {
            id: 'australia-southeast1-a',
            name: 'Asia/Pacific - Australia East',
          },
          doc_count: 680,
        },
        {
          key: {
            id: 'europe-west2-a',
            name: 'Europe - United Kingdom',
          },
          doc_count: 1559,
        },
      ],
    },
  },
};

const locations = data.aggregations.locations.buckets.map((bucket) => ({
  label: bucket.key.name,
  id: bucket.key.id,
  agentPolicyId: bucket.key.id,
  tags: [],
  geo: {
    lat: 0,
    lon: 0,
  },
  namespace: undefined,
  isServiceManaged: false,
}));

console.log(locations);
