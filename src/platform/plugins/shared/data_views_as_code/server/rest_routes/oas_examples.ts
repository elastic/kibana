/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Used for documenting/introspecting APIs. Always load it lazily!
 */

const dataViewBody = {
  name: 'Web logs',
  index_pattern: 'logs-*',
  time_field: '@timestamp',
};

// Get, create and update responses return the full spec and only the data view meta.
const dataViewResponse = {
  id: 'c0ffee00-d57a-11ef-9a52-4f3c2a8d0e1b',
  data: dataViewBody,
  meta: {
    managed: false,
    version: 'WzEsMV0=',
    spaces: ['default'],
  },
};

const dataViewRequestExamples = {
  createDataViewRequest: {
    summary: 'Create a data view',
    value: dataViewBody,
  },
};

const dataViewResponseExamples = {
  dataViewResponse: {
    summary: 'Data view response',
    value: dataViewResponse,
  },
};

// The list response is built from saved objects: it only includes name, index_pattern and
// time_field, and its meta also includes the saved object audit fields.
export const getDataViewsOASOperationObject = {
  responses: {
    200: {
      content: {
        'application/json': {
          examples: {
            getDataViewsResponse: {
              summary: 'Paginated data views response',
              value: {
                data: [
                  {
                    id: 'c0ffee00-d57a-11ef-9a52-4f3c2a8d0e1b',
                    data: dataViewBody,
                    meta: {
                      created_at: '2026-01-15T10:00:00.000Z',
                      created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
                      updated_at: '2026-01-16T08:30:00.000Z',
                      updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
                      managed: false,
                      version: 'WzIsMV0=',
                      spaces: ['default'],
                    },
                  },
                  {
                    id: 'a1b2c3d4-d57a-11ef-9a52-4f3c2a8d0e1b',
                    data: { name: 'Metrics', index_pattern: 'metrics-*' },
                    meta: {
                      created_at: '2026-01-15T11:00:00.000Z',
                      updated_at: '2026-01-15T11:00:00.000Z',
                      managed: false,
                      version: 'WzMsMV0=',
                      spaces: ['default'],
                    },
                  },
                ],
                meta: { page: 1, per_page: 20, total: 2 },
              },
            },
          },
        },
      },
    },
  },
};

export const getDataViewOASOperationObject = {
  responses: {
    200: { content: { 'application/json': { examples: dataViewResponseExamples } } },
  },
};

export const postDataViewOASOperationObject = {
  requestBody: { content: { 'application/json': { examples: dataViewRequestExamples } } },
  responses: {
    201: { content: { 'application/json': { examples: dataViewResponseExamples } } },
  },
};

export const putDataViewOASOperationObject = {
  requestBody: {
    content: {
      'application/json': {
        examples: {
          updateDataViewRequest: {
            summary: 'Create or update a data view',
            value: dataViewBody,
          },
        },
      },
    },
  },
  responses: {
    200: { content: { 'application/json': { examples: dataViewResponseExamples } } },
    201: { content: { 'application/json': { examples: dataViewResponseExamples } } },
  },
};
