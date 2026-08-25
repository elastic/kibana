/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_OTHER_FIELDS_LENGTH } from '../constants';
import { ExecutorSubActionPushParamsSchema, incidentSchemaObjectProperties } from './v1';

describe('Jira schema', () => {
  const incident = {
    summary: 'title',
    description: 'desc',
    labels: [],
    issueType: '10006',
    priority: 'High',
    parent: 'RJ-107',
    otherFields: null,
  };

  describe('ExecutorSubActionPushParamsSchema', () => {
    it('validates the test object ExecutorSubActionPushParamsSchema correctly', () => {
      expect(() => ExecutorSubActionPushParamsSchema.parse({ incident })).not.toThrow();
    });

    describe('otherFields', () => {
      it('validates the otherFields correctly', () => {
        expect(() =>
          ExecutorSubActionPushParamsSchema.parse({
            incident: {
              ...incident,
              otherFields: {
                foo: 'bar',
                foo1: true,
                foo2: 2,
              },
            },
          })
        ).not.toThrow();
      });

      it('throws if the otherFields object has too many properties', () => {
        const otherFields = new Array(MAX_OTHER_FIELDS_LENGTH + 1)
          .fill('foobar')
          .reduce((acc, curr, idx) => {
            acc[idx] = curr;
            return acc;
          }, {});

        expect(() =>
          ExecutorSubActionPushParamsSchema.parse({
            incident: {
              ...incident,
              otherFields,
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(`
          "[
            {
              \\"code\\": \\"custom\\",
              \\"message\\": \\"A maximum of 20 fields in otherFields can be defined at a time.\\",
              \\"path\\": [
                \\"incident\\",
                \\"otherFields\\"
              ]
            }
          ]"
        `);
      });

      it.each(incidentSchemaObjectProperties)(
        'throws if the otherFields object has the %p property',
        (property) => {
          const otherFields = {
            [property]: 'foobar',
          };
          expect(() =>
            ExecutorSubActionPushParamsSchema.parse({
              incident: {
                ...incident,
                otherFields,
              },
            })
          ).toThrow(`The following properties cannot be defined inside otherFields: ${property}.`);
        }
      );
    });
  });
});
