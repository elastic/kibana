/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { createOASDocument } from '../../create_oas_document';
import { bundleSpecs } from '../bundle_specs';

describe('OpenAPI Bundler - with security requirements overrides', () => {
  describe('enabled', () => {
    it('throws an error when security requirements are specified without components security schemes', async () => {
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
              responses: {},
            },
          },
        },
      });

      await expect(
        bundleSpecs(
          {
            1: spec1,
          },
          {
            prototypeDocument: {
              security: [{ ShouldBeUsedSecurityRequirement: [] }],
            },
          }
        )
      ).rejects.toThrowError(
        `Prototype document must contain ${chalk.bold(
          'components.securitySchemes'
        )} when security requirements are specified`
      );
    });

    it('throws an error when components security schemes are specified without security requirements', async () => {
      const spec1 = createOASDocument({
        paths: {
          '/api/some_api': {
            get: {
              responses: {},
            },
          },
        },
      });

      await expect(
        bundleSpecs(
          {
            1: spec1,
          },
          {
            prototypeDocument: {
              components: {
                securitySchemes: {
                  ShouldBeUsedSecurityRequirement: {
                    type: 'http',
                    scheme: 'basic',
                  },
                },
              },
            },
          }
        )
      ).rejects.toThrowError(
        `Prototype document must have ${chalk.bold('security')} defined ${chalk.bold(
          'components.securitySchemes'
        )} are specified`
      );
    });

    it('overrides root level `security`', async () => {
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
        security: [{ SomeSecurityRequirement: [] }],
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
        security: [{ AnotherSecurityRequirement: [] }, { AdditionalSecurityRequirement: [] }],
      });

      const [bundledSpec] = Object.values(
        await bundleSpecs(
          {
            1: spec1,
            2: spec2,
          },
          {
            prototypeDocument: {
              security: [{ ShouldBeUsedSecurityRequirement: [] }],
              components: {
                securitySchemes: {
                  ShouldBeUsedSecurityRequirement: {
                    type: 'http',
                    scheme: 'basic',
                  },
                },
              },
            },
          }
        )
      );

      expect(bundledSpec.security).toEqual([{ ShouldBeUsedSecurityRequirement: [] }]);
      expect(bundledSpec.components?.securitySchemes).toEqual({
        ShouldBeUsedSecurityRequirement: {
          type: 'http',
          scheme: 'basic',
        },
      });
    });

    it('drops operation level security requirements', async () => {
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
              security: [{ SomeSecurityRequirement: [] }],
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
              security: [{ AnotherSecurityRequirement: [] }, { AdditionalSecurityRequirement: [] }],
            },
          },
        },
      });

      const [bundledSpec] = Object.values(
        await bundleSpecs(
          {
            1: spec1,
            2: spec2,
          },
          {
            prototypeDocument: {
              security: [{ ShouldBeUsedSecurityRequirement: [] }],
              components: {
                securitySchemes: {
                  ShouldBeUsedSecurityRequirement: {
                    type: 'http',
                    scheme: 'basic',
                  },
                },
              },
            },
          }
        )
      );

      expect(bundledSpec.paths['/api/some_api']?.get?.security).toBeUndefined();
      expect(bundledSpec.paths['/api/another_api']?.get?.security).toBeUndefined();
    });
  });

  describe('disabled', () => {
    it('bundles root level security requirements', async () => {
      const spec1Security = [{ SomeSecurityRequirement: [] }];
      const spec1SecuritySchemes = {
        SomeSecurityRequirement: {
          type: 'http',
          scheme: 'basic',
        },
      } as const;
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
        security: spec1Security,
        components: {
          securitySchemes: spec1SecuritySchemes,
        },
      });
      const spec2Security: OpenAPIV3.SecurityRequirementObject[] = [
        { AnotherSecurityRequirement: [] },
        { AdditionalSecurityRequirement: [] },
      ];
      const spec2SecuritySchemes = {
        AnotherSecurityRequirement: {
          type: 'http',
          scheme: 'basic',
        },
        AdditionalSecurityRequirement: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'header',
        },
      } as const;
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
        security: spec2Security,
        components: {
          securitySchemes: spec2SecuritySchemes,
        },
      });

      const [bundledSpec] = Object.values(
        await bundleSpecs({
          1: spec1,
          2: spec2,
        })
      );

      expect(bundledSpec.security).toEqual(
        expect.arrayContaining([...spec1Security, ...spec2Security])
      );
      expect(bundledSpec.components?.securitySchemes).toMatchObject({
        ...spec1SecuritySchemes,
        ...spec2SecuritySchemes,
      });
    });

    it('bundles operation level security requirements', async () => {
      const spec1Security = [{ SomeSecurityRequirement: [] }];
      const spec1SecuritySchemes = {
        SomeSecurityRequirement: {
          type: 'http',
          scheme: 'basic',
        },
      } as const;
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
              security: spec1Security,
            },
          },
        },
        components: {
          securitySchemes: spec1SecuritySchemes,
        },
      });
      const spec2Security: OpenAPIV3.SecurityRequirementObject[] = [
        { AnotherSecurityRequirement: [] },
        { AdditionalSecurityRequirement: [] },
      ];
      const spec2SecuritySchemes = {
        AnotherSecurityRequirement: {
          type: 'http',
          scheme: 'basic',
        },
        AdditionalSecurityRequirement: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'header',
        },
      } as const;
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
              security: spec2Security,
            },
          },
        },
        components: {
          securitySchemes: spec2SecuritySchemes,
        },
      });

      const [bundledSpec] = Object.values(
        await bundleSpecs({
          1: spec1,
          2: spec2,
        })
      );

      expect(bundledSpec.paths['/api/some_api']?.get?.security).toEqual(spec1Security);
      expect(bundledSpec.paths['/api/another_api']?.get?.security).toEqual(spec2Security);
      expect(bundledSpec.components?.securitySchemes).toMatchObject({
        ...spec1SecuritySchemes,
        ...spec2SecuritySchemes,
      });
    });
  });
});
