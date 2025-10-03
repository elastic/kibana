/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('fs/promises');

import { UPSTREAM_BRANCH } from '@kbn/repo-info';
import { prAutomatedChecks } from './pr_automated_checks';
import { createTaskContext, type TelemetryRoot } from './task_context';

const BASE_ROOT: TelemetryRoot = {
  config: {
    root: 'test',
    output: 'test.json',
    exclude: [],
  },
};

describe('prAutomatedChecks', () => {
  const context = createTaskContext();

  beforeEach(() => {
    context.reporter.errors.length = 0; // Empty the errors
    context.roots.length = 0; // Empty the roots
  });

  describe('Download schema from main branch', () => {
    test(`downloads the file from the ${UPSTREAM_BRANCH} branch`, async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      context.roots.push({ ...BASE_ROOT });
      const [downloadSchemas] = prAutomatedChecks(context);

      expect(context.roots[0].upstreamMapping).toBeUndefined();

      const upstreamMappings = { properties: {} };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(upstreamMappings),
      } as Partial<Response> as Response);

      // @ts-expect-error We know that the method doesn't use the arguments
      await downloadSchemas.task();

      expect(context.roots[0].upstreamMapping).toEqual(upstreamMappings);
    });

    test(`fails to download the file from the ${UPSTREAM_BRANCH} branch`, async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      context.roots.push({ ...BASE_ROOT });
      const [downloadSchemas] = prAutomatedChecks(context);

      expect(context.roots[0].upstreamMapping).toBeUndefined();

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Who checks the checker?',
      } as Partial<Response> as Response);

      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(downloadSchemas.task()).rejects.toMatchInlineSnapshot(
        `[Error: Failed to fetch https://raw.githubusercontent.com/elastic/kibana/refs/heads/main/test.json: 404 Who checks the checker?]`
      );
    });
  });
  describe('Schema PR checks', () => {
    const readFileSpy = jest.requireMock('fs/promises').readFile;

    test('check pass: empty schemas', async () => {
      context.roots.push({
        ...BASE_ROOT,
        upstreamMapping: { properties: {} },
      });

      readFileSpy.mockResolvedValueOnce(JSON.stringify({ properties: {} }));

      const [, verifyChanges, throwIfError] = prAutomatedChecks(context);
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(verifyChanges.task()).resolves.toBeUndefined();
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(throwIfError.task()).resolves.toBeUndefined();
    });

    test('new field should have a description', async () => {
      context.roots.push({
        ...BASE_ROOT,
        upstreamMapping: { properties: {} },
      });
      readFileSpy.mockResolvedValueOnce(
        JSON.stringify({
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  type: 'keyword',
                },
              },
            },
          },
        })
      );

      const [, verifyChanges, throwIfError] = prAutomatedChecks(context);
      // @ts-expect-error We know that the method doesn't use the arguments
      await verifyChanges.task();
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(throwIfError.task()).rejects.toMatchInlineSnapshot(`
        ErrorReporter {
          "errors": Array [
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        The _meta.description of properties.myCollector.properties.some_field is missing. Please add it.",
          ],
        }
      `);
    });

    test('a field removed the description', async () => {
      context.roots.push({
        ...BASE_ROOT,
        upstreamMapping: {
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  type: 'keyword',
                  _meta: {
                    description: 'This is a description',
                  },
                },
              },
            },
          },
        },
      });
      readFileSpy.mockResolvedValueOnce(
        JSON.stringify({
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  type: 'keyword',
                },
              },
            },
          },
        })
      );
      const [, verifyChanges, throwIfError] = prAutomatedChecks(context);
      // @ts-expect-error We know that the method doesn't use the arguments
      await verifyChanges.task();
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(throwIfError.task()).rejects.toMatchInlineSnapshot(`
        ErrorReporter {
          "errors": Array [
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        The _meta.description of properties.myCollector.properties.some_field has been removed. Please add it back.",
          ],
        }
      `);
    });

    test('a field removed the description (inside an array)', async () => {
      context.roots.push({
        ...BASE_ROOT,
        upstreamMapping: {
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  type: 'array',
                  items: {
                    type: 'keyword',
                    _meta: {
                      description: 'This is a description',
                    },
                  },
                },
              },
            },
          },
        },
      });
      readFileSpy.mockResolvedValueOnce(
        JSON.stringify({
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  type: 'array',
                  items: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        })
      );
      const [, verifyChanges, throwIfError] = prAutomatedChecks(context);
      // @ts-expect-error We know that the method doesn't use the arguments
      await verifyChanges.task();
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(throwIfError.task()).rejects.toMatchInlineSnapshot(`
        ErrorReporter {
          "errors": Array [
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        The _meta.description of properties.myCollector.properties.some_field.items has been removed. Please add it back.",
          ],
        }
      `);
    });

    test('previous object changed to single value', async () => {
      context.roots.push({
        ...BASE_ROOT,
        upstreamMapping: {
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  properties: {
                    some_other_field: {
                      type: 'keyword',
                    },
                  },
                },
              },
            },
          },
        },
      });
      readFileSpy.mockResolvedValueOnce(
        JSON.stringify({
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  type: 'keyword',
                  _meta: {
                    description: 'This is a description',
                  },
                },
              },
            },
          },
        })
      );
      const [, verifyChanges, throwIfError] = prAutomatedChecks(context);
      // @ts-expect-error We know that the method doesn't use the arguments
      await verifyChanges.task();
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(throwIfError.task()).rejects.toMatchInlineSnapshot(`
        ErrorReporter {
          "errors": Array [
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        Incompatible change in key \\"properties.myCollector.properties.some_field\\": it has been changed from an object to a single value.",
          ],
        }
      `);
    });

    test('previous single value changed to object', async () => {
      context.roots.push({
        ...BASE_ROOT,
        upstreamMapping: {
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  type: 'keyword',
                },
              },
            },
          },
        },
      });
      readFileSpy.mockResolvedValueOnce(
        JSON.stringify({
          properties: {
            myCollector: {
              properties: {
                some_field: {
                  properties: {
                    some_other_field: {
                      type: 'keyword',
                      _meta: {
                        description: 'This is a description',
                      },
                    },
                  },
                },
              },
            },
          },
        })
      );
      const [, verifyChanges, throwIfError] = prAutomatedChecks(context);
      // @ts-expect-error We know that the method doesn't use the arguments
      await verifyChanges.task();
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(throwIfError.task()).rejects.toMatchInlineSnapshot(`
        ErrorReporter {
          "errors": Array [
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        Incompatible change in key \\"properties.myCollector.properties.some_field\\": it has been changed from a single value to an object.",
          ],
        }
      `);
    });

    test('modified fields', async () => {
      context.roots.push({
        ...BASE_ROOT,
        upstreamMapping: {
          properties: {
            myCollector: {
              properties: {
                compatible_modification_without_description: {
                  type: 'short',
                },
                string_to_number: {
                  type: 'text',
                },
                string_to_boolean: {
                  type: 'text',
                },
                number_to_boolean: {
                  type: 'long',
                },
              },
            },
          },
        },
      });
      readFileSpy.mockResolvedValueOnce(
        JSON.stringify({
          properties: {
            myCollector: {
              properties: {
                compatible_modification_without_description: {
                  type: 'long',
                },
                string_to_number: {
                  type: 'long',
                },
                string_to_boolean: {
                  type: 'boolean',
                  _meta: {
                    description: 'This is a description',
                  },
                },
                number_to_boolean: {
                  type: 'boolean',
                  _meta: {
                    description: 'This is a description',
                  },
                },
              },
            },
          },
        })
      );
      const [, verifyChanges, throwIfError] = prAutomatedChecks(context);
      // @ts-expect-error We know that the method doesn't use the arguments
      await verifyChanges.task();
      // @ts-expect-error We know that the method doesn't use the arguments
      await expect(throwIfError.task()).rejects.toMatchInlineSnapshot(`
        ErrorReporter {
          "errors": Array [
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        The _meta.description of properties.myCollector.properties.compatible_modification_without_description is missing. Please add it.",
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        Incompatible change in key \\"properties.myCollector.properties.string_to_number\\": it has been changed from a non-numeric type \\"text\\" to a numeric type \\"long\\".",
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        The _meta.description of properties.myCollector.properties.string_to_number is missing. Please add it.",
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        Incompatible change in key \\"properties.myCollector.properties.string_to_boolean\\": it has been changed from a non-boolean type \\"text\\" to a \\"boolean\\" type.",
            "[37m[41m TELEMETRY ERROR [49m[39m Error in test.json
        Incompatible change in key \\"properties.myCollector.properties.number_to_boolean\\": it has been changed from a non-boolean type \\"long\\" to a \\"boolean\\" type.",
          ],
        }
      `);
    });
  });
});
