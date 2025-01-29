/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { createOASDocument } from '../../create_oas_document';
import { mergeSpecs } from '../merge_specs';

// Disable naming convention check due to tests on spec title prefixes
// like Spec1_Something which violates that rule
/* eslint-disable @typescript-eslint/naming-convention */

describe('OpenAPI Merger - with security requirements overrides', () => {
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
        mergeSpecs(
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
        mergeSpecs(
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
        await mergeSpecs(
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
        await mergeSpecs(
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
      const spec1 = createOASDocument({
        info: {
          title: 'Spec1',
        },
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
        components: {
          securitySchemes: {
            SomeSecurityRequirement: {
              type: 'http',
              scheme: 'basic',
            },
          },
        },
      });
      const spec2 = createOASDocument({
        info: {
          title: 'Spec2',
        },
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
        components: {
          securitySchemes: {
            AnotherSecurityRequirement: {
              type: 'http',
              scheme: 'basic',
            },
            AdditionalSecurityRequirement: {
              type: 'apiKey',
              name: 'apiKey',
              in: 'header',
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

      expect(bundledSpec.security).toEqual(
        expect.arrayContaining([
          { Spec1_SomeSecurityRequirement: [] },
          { Spec2_AnotherSecurityRequirement: [] },
          { Spec2_AdditionalSecurityRequirement: [] },
        ])
      );
      expect(bundledSpec.components?.securitySchemes).toMatchObject({
        Spec1_SomeSecurityRequirement: expect.anything(),
        Spec2_AnotherSecurityRequirement: expect.anything(),
        Spec2_AdditionalSecurityRequirement: expect.anything(),
      });
    });

    it('bundles operation level security requirements', async () => {
      const spec1 = createOASDocument({
        info: {
          title: 'Spec1',
        },
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
        components: {
          securitySchemes: {
            SomeSecurityRequirement: {
              type: 'http',
              scheme: 'basic',
            },
          },
        },
      });
      const spec2 = createOASDocument({
        info: {
          title: 'Spec2',
        },
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
        components: {
          securitySchemes: {
            AnotherSecurityRequirement: {
              type: 'http',
              scheme: 'basic',
            },
            AdditionalSecurityRequirement: {
              type: 'apiKey',
              name: 'apiKey',
              in: 'header',
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

      expect(bundledSpec.paths['/api/some_api']?.get?.security).toEqual([
        { Spec1_SomeSecurityRequirement: [] },
      ]);
      expect(bundledSpec.paths['/api/another_api']?.get?.security).toEqual([
        { Spec2_AnotherSecurityRequirement: [] },
        { Spec2_AdditionalSecurityRequirement: [] },
      ]);
      expect(bundledSpec.components?.securitySchemes).toMatchObject({
        Spec1_SomeSecurityRequirement: expect.anything(),
        Spec2_AnotherSecurityRequirement: expect.anything(),
        Spec2_AdditionalSecurityRequirement: expect.anything(),
      });
    });
  });
});
