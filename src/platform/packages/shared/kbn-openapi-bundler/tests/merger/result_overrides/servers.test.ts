/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createOASDocument } from '../../create_oas_document';
import { mergeSpecs } from '../merge_specs';

describe('OpenAPI Merger - with `servers` overrides', () => {
  describe('enabled', () => {
    it('overrides root level `servers`', async () => {
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
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
        servers: [{ url: 'https://some-url' }],
      });
      const spec2 = createOASDocument({
        paths: {
          '/api/another_api': {
            get: {
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
        servers: [
          { url: 'https://another-url', description: 'some description' },
          { url: 'https://something-else-url', description: 'some description' },
        ],
      });

      const [bundledSpec] = Object.values(
        await mergeSpecs(
          {
            1: spec1,
            2: spec2,
          },
          {
            prototypeDocument: {
              servers: [
                { url: 'https://should-be-used-url', description: 'Should be used description' },
              ],
            },
          }
        )
      );

      expect(bundledSpec.servers).toEqual([
        { url: 'https://should-be-used-url', description: 'Should be used description' },
      ]);
    });

    it('drops path level `servers`', async () => {
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
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
            servers: [{ url: 'https://some-url' }],
          },
        },
      });
      const spec2 = createOASDocument({
        paths: {
          '/api/another_api': {
            get: {
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
            servers: [
              { url: 'https://another-url', description: 'some description' },
              { url: 'https://something-else-url', description: 'some description' },
            ],
          },
        },
      });

      const [bundledSpec] = Object.values(
        await mergeSpecs(
          {
            1: spec1,
            2: spec2,
          },
          {
            prototypeDocument: {
              servers: [
                { url: 'https://should-be-used-url', description: 'Should be used description' },
              ],
            },
          }
        )
      );

      expect(bundledSpec.paths['/api/some_api']?.servers).toBeUndefined();
      expect(bundledSpec.paths['/api/another_api']?.servers).toBeUndefined();
    });

    it('drops operation level `servers`', async () => {
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
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
              servers: [{ url: 'https://some-url' }],
            },
          },
        },
      });
      const spec2 = createOASDocument({
        paths: {
          '/api/another_api': {
            get: {
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
              servers: [
                { url: 'https://another-url', description: 'some description' },
                { url: 'https://something-else-url', description: 'some description' },
              ],
            },
          },
        },
      });

      const [bundledSpec] = Object.values(
        await mergeSpecs(
          {
            1: spec1,
            2: spec2,
          },
          {
            prototypeDocument: {
              servers: [
                { url: 'https://should-be-used-url', description: 'Should be used description' },
              ],
            },
          }
        )
      );

      expect(bundledSpec.paths['/api/some_api']?.get?.servers).toBeUndefined();
      expect(bundledSpec.paths['/api/another_api']?.get?.servers).toBeUndefined();
    });
  });

  describe('disabled', () => {
    it('bundles root level `servers`', async () => {
      const spec1Servers = [{ url: 'https://some-url' }];
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
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
        servers: spec1Servers,
      });
      const spec2Servers = [
        { url: 'https://another-url', description: 'some description' },
        { url: 'https://something-else-url', description: 'some description' },
      ];
      const spec2 = createOASDocument({
        paths: {
          '/api/another_api': {
            get: {
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
        servers: spec2Servers,
      });

      const [bundledSpec] = Object.values(
        await mergeSpecs({
          1: spec1,
          2: spec2,
        })
      );

      const DEFAULT_ENTRY = {
        url: 'http://{kibana_host}:{port}',
        variables: {
          kibana_host: {
            default: 'localhost',
          },
          port: {
            default: '5601',
          },
        },
      };

      expect(bundledSpec.servers).toEqual([DEFAULT_ENTRY, ...spec1Servers, ...spec2Servers]);
    });

    it('bundles path level `servers`', async () => {
      const spec1Servers = [{ url: 'https://some-url' }];
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
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
            servers: spec1Servers,
          },
        },
      });
      const spec2Servers = [
        { url: 'https://another-url', description: 'some description' },
        { url: 'https://something-else-url', description: 'some description' },
      ];
      const spec2 = createOASDocument({
        paths: {
          '/api/another_api': {
            get: {
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
            servers: spec2Servers,
          },
        },
      });

      const [bundledSpec] = Object.values(
        await mergeSpecs({
          1: spec1,
          2: spec2,
        })
      );

      expect(bundledSpec.paths['/api/some_api']?.servers).toEqual(spec1Servers);
      expect(bundledSpec.paths['/api/another_api']?.servers).toEqual(spec2Servers);
    });

    it('bundles operation level `servers`', async () => {
      const spec1Servers = [{ url: 'https://some-url' }];
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
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
              servers: spec1Servers,
            },
          },
        },
      });
      const spec2Servers = [
        { url: 'https://another-url', description: 'some description' },
        { url: 'https://something-else-url', description: 'some description' },
      ];
      const spec2 = createOASDocument({
        paths: {
          '/api/another_api': {
            get: {
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
              servers: spec2Servers,
            },
          },
        },
      });

      const [bundledSpec] = Object.values(
        await mergeSpecs({
          1: spec1,
          2: spec2,
        })
      );

      expect(bundledSpec.paths['/api/some_api']?.get?.servers).toEqual(spec1Servers);
      expect(bundledSpec.paths['/api/another_api']?.get?.servers).toEqual(spec2Servers);
    });
  });
});
