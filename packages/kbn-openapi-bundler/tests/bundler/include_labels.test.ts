/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from '../create_oas_document';

describe('OpenAPI Bundler - include labeled operations', () => {
  it.each([
    {
      label: 'labelA',
      expectedPathObjects: { '/api/some_api': ['post'], '/api/another_api': ['get'] },
    },
    { label: 'labelB', expectedPathObjects: { '/api/some_api': ['get'] } },
  ])('includes operation objects with "$label" label', async ({ label, expectedPathObjects }) => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['labelB'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          post: {
            'x-labels': ['labelA'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/another_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['labelA'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: [label],
        }
      )
    );

    expect(Object.keys(bundledSpec.paths)).toEqual(
      expect.arrayContaining(Object.keys(expectedPathObjects))
    );

    for (const [path, verbs] of Object.entries(expectedPathObjects)) {
      expect(Object.keys(bundledSpec.paths[path]!)).toEqual(expect.arrayContaining(verbs));
    }
  });

  it('includes operation objects with multiple labels', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['labelA', 'labelB'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: ['labelA', 'labelB'],
        }
      )
    );

    expect(bundledSpec.paths).toEqual({
      '/api/some_api': {
        get: expect.anything(),
      },
    });
  });

  it('does NOT include operation objects with incomplete labels set', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['labelA', 'labelB', 'labelC'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          put: {
            'x-labels': ['labelA', 'labelC'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: ['labelA', 'labelB'],
        }
      )
    );

    expect(bundledSpec.paths).toEqual({
      '/api/some_api': {
        get: expect.anything(),
      },
    });
  });

  it('does NOT include operation objects without labels', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['labelA'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/missing_label_should_not_be_in_bundle': {
          put: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: ['labelA'],
        }
      )
    );

    expect(bundledSpec.paths).toEqual({
      '/api/some_api': {
        get: expect.anything(),
      },
    });
  });

  it('does NOT include operation objects when labels are not an array', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': 10,
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          put: {
            'x-labels': ['labelA'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: ['labelA'],
        }
      )
    );

    expect(bundledSpec.paths).toEqual({
      '/api/some_api': {
        put: expect.anything(),
      },
    });
  });

  it('removes path items without HTTP verbs defined', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['labelA'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/to_be_removed': {
          summary: 'Some API PUT method OAS definition',
          put: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['labelB'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: ['labelA'],
        }
      )
    );

    expect(bundledSpec.paths).toEqual({
      '/api/some_api': {
        get: expect.anything(),
      },
    });
  });
});
