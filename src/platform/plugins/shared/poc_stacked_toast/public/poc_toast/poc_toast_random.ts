/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PocToastInput } from './poc_toast_types';

const pocToastSamples: readonly PocToastInput[] = [
  {
    type: 'info',
    title: 'Dashboard saved',
  },
  {
    type: 'info',
    title: 'New data available',
    text: 'Daily sales summary finished indexing 2 minutes ago.',
  },
  {
    type: 'info',
    title: 'Report scheduled',
    text: 'Your weekly usage report will be emailed Monday at 09:00 UTC.',
    cta: { label: 'View schedule' },
  },
  {
    type: 'warning',
    title: 'Maintenance in 10 minutes',
  },
  {
    type: 'warning',
    title: 'Index lifecycle policy expiring',
    text: 'logs-* indices will roll over in 3 days unless you extend the policy.',
    cta: { label: 'Review policy' },
  },
  {
    type: 'warning',
    title: 'License usage approaching limit',
    text:
      'Machine learning jobs are using 82% of your allocated ML nodes. Consider reducing ' +
      'the number of concurrent jobs or upgrading your deployment before autoscaling limits ' +
      'are reached.',
  },
  {
    type: 'error',
    title: 'Failed to save visualization',
    text: 'Could not persist changes to "Revenue by region". Try again or copy your edits.',
    cta: { label: 'Retry save' },
  },
  {
    type: 'error',
    title: 'Ingest pipeline error',
    text:
      'Processor "grok" failed on document id 9f2a… in index logs-production. The pattern ' +
      'did not match the incoming message format. Check the pipeline definition and sample ' +
      'documents in Discover to adjust field mappings or grok patterns before reprocessing ' +
      'the failed batch.',
  },
  {
    type: 'error',
    title: 'Connection timed out',
    text: 'Kibana could not reach Elasticsearch after 30s. Your cluster may be restarting.',
  },
];

export const createRandomPocToastInput = (): PocToastInput => {
  const index = Math.floor(Math.random() * pocToastSamples.length);
  return pocToastSamples[index];
};
