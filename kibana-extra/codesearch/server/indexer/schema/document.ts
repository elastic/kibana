/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Coorespond to model/search/Document
export const DocumentSchema = {
  repoUri: {
    type: 'text',
  },
  path: {
    type: 'text',
  },
  content: {
    type: 'text',
  },
  qnames: {
    type: 'text',
  },
  language: {
    type: 'text',
  },
  sha1: {
    type: 'text',
  },
};
