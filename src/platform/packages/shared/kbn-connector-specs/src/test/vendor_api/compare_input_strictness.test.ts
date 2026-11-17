/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compareInputStrictness } from './compare_input_strictness';

const keywords = (vendor: unknown, connector: unknown) =>
  compareInputStrictness(vendor, connector).map(({ keyword }) => keyword);

describe('compareInputStrictness', () => {
  describe('format', () => {
    it('reports an input that declares no format where the vendor requires one', () => {
      expect(
        compareInputStrictness({ type: 'string', format: 'uuid' }, { type: 'string' })
      ).toEqual([{ keyword: 'format', vendor: 'uuid', connector: 'nothing' }]);
    });

    it('accepts an input that declares the same format', () => {
      expect(
        compareInputStrictness(
          { type: 'string', format: 'uuid' },
          { type: 'string', format: 'uuid' }
        )
      ).toEqual([]);
    });

    it('accepts an input that enforces the shape with a pattern instead', () => {
      expect(
        compareInputStrictness(
          { type: 'string', format: 'uuid' },
          { type: 'string', pattern: '^[0-9a-f-]{36}$' }
        )
      ).toEqual([]);
    });

    it('accepts an input that lists the values it allows', () => {
      expect(
        compareInputStrictness({ type: 'string', format: 'date' }, { enum: ['2026-11-17'] })
      ).toEqual([]);
    });

    it('ignores the OpenAPI encodings a connector input cannot restate', () => {
      expect(
        compareInputStrictness({ type: 'integer', format: 'int64' }, { type: 'integer' })
      ).toEqual([]);
    });

    it('reports a format the input declares differently', () => {
      expect(
        compareInputStrictness(
          { type: 'string', format: 'date-time' },
          { type: 'string', format: 'date' }
        )
      ).toEqual([{ keyword: 'format', vendor: 'date-time', connector: 'date' }]);
    });
  });

  describe('pattern', () => {
    it('reports an input with no pattern where the vendor has one', () => {
      expect(
        compareInputStrictness({ type: 'string', pattern: '^[0-9a-f]{24}$' }, { type: 'string' })
      ).toEqual([{ keyword: 'pattern', vendor: '^[0-9a-f]{24}$', connector: 'nothing' }]);
    });

    it('accepts the same pattern', () => {
      const schema = { type: 'string', pattern: '^[0-9a-f]{24}$' };
      expect(compareInputStrictness(schema, { ...schema })).toEqual([]);
    });

    it('leaves a differently spelled pattern to review', () => {
      expect(
        compareInputStrictness(
          { type: 'string', pattern: '^[0-9a-f]{24}$' },
          { type: 'string', pattern: '^[0-9a-f]{24}(,[0-9a-f]{24})*$' }
        )
      ).toEqual([]);
    });
  });

  describe('enum', () => {
    it('reports a value the vendor does not allow', () => {
      expect(
        compareInputStrictness({ enum: ['open', 'closed'] }, { enum: ['open', 'merged'] })
      ).toEqual([{ keyword: 'enum', vendor: '["open","closed"]', connector: '["merged"]' }]);
    });

    it('accepts a subset', () => {
      expect(compareInputStrictness({ enum: ['open', 'closed'] }, { enum: ['open'] })).toEqual([]);
    });

    it('accepts a const the vendor allows', () => {
      expect(compareInputStrictness({ enum: ['open', 'closed'] }, { const: 'open' })).toEqual([]);
    });

    it('reports an unconstrained input', () => {
      expect(keywords({ enum: ['open', 'closed'] }, { type: 'string' })).toEqual(['enum']);
    });
  });

  describe('bounds', () => {
    it('reports an input with no ceiling', () => {
      expect(
        compareInputStrictness({ type: 'integer', maximum: 100 }, { type: 'integer' })
      ).toEqual([{ keyword: 'maximum', vendor: '100', connector: 'nothing' }]);
    });

    it('reports a ceiling above the vendor', () => {
      expect(
        compareInputStrictness(
          { type: 'integer', maximum: 100 },
          { type: 'integer', maximum: 1000 }
        )
      ).toEqual([{ keyword: 'maximum', vendor: '100', connector: '1000' }]);
    });

    it('accepts a ceiling at or below the vendor', () => {
      expect(
        compareInputStrictness({ type: 'integer', maximum: 100 }, { type: 'integer', maximum: 50 })
      ).toEqual([]);
    });

    it('reports a floor below the vendor', () => {
      expect(
        compareInputStrictness({ type: 'integer', minimum: 1 }, { type: 'integer', minimum: 0 })
      ).toEqual([{ keyword: 'minimum', vendor: '1', connector: '0' }]);
    });

    it('reads an exclusive bound as the tighter one', () => {
      expect(
        compareInputStrictness(
          { type: 'integer', exclusiveMaximum: 100 },
          { type: 'integer', maximum: 150 }
        )
      ).toEqual([{ keyword: 'maximum', vendor: '100', connector: '150' }]);
    });

    it('ignores a length or size floor of zero, which allows everything', () => {
      expect(compareInputStrictness({ type: 'string', minLength: 0 }, { type: 'string' })).toEqual(
        []
      );
      expect(compareInputStrictness({ type: 'array', minItems: 0 }, { type: 'array' })).toEqual([]);
    });

    it('keeps a minimum of zero, which rules out negatives', () => {
      expect(keywords({ type: 'integer', minimum: 0 }, { type: 'integer' })).toEqual(['minimum']);
    });

    it('checks string lengths and array sizes', () => {
      expect(
        keywords(
          { type: 'string', maxLength: 255, minLength: 2 },
          { type: 'string', maxLength: 1000 }
        )
      ).toEqual(['maxLength', 'minLength']);
      expect(keywords({ type: 'array', maxItems: 10 }, { type: 'array' })).toEqual(['maxItems']);
    });
  });

  describe('composition', () => {
    it('merges allOf parts before comparing', () => {
      expect(
        compareInputStrictness(
          { allOf: [{ type: 'string' }, { maxLength: 10 }] },
          { type: 'string', maxLength: 20 }
        )
      ).toEqual([{ keyword: 'maxLength', vendor: '10', connector: '20' }]);
    });

    it('takes the vendor branch the input matches best', () => {
      const vendor = { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'integer' }] };
      expect(compareInputStrictness(vendor, { type: 'integer' })).toEqual([]);
    });

    it('reports a gap only when every branch of the input has it', () => {
      const vendor = { type: 'string', maxLength: 10 };
      expect(
        compareInputStrictness(vendor, { anyOf: [{ maxLength: 5 }, { maxLength: 50 }] })
      ).toEqual([]);
      expect(
        compareInputStrictness(vendor, { anyOf: [{ maxLength: 20 }, { maxLength: 50 }] })
      ).toEqual([{ keyword: 'maxLength', vendor: '10', connector: '20' }]);
    });
  });

  describe('kinds', () => {
    it('says nothing when the handler converts the value on its way out', () => {
      expect(
        compareInputStrictness(
          { type: 'integer', minimum: 0 },
          { type: 'string', description: 'an ISO 8601 timestamp the handler turns into millis' }
        )
      ).toEqual([]);
    });

    it('reads integer and number as the same kind', () => {
      expect(keywords({ type: 'integer', maximum: 10 }, { type: 'number' })).toEqual(['maximum']);
    });

    it('reads a nullable value as its named type', () => {
      expect(keywords({ type: 'string', maxLength: 5 }, { type: ['string', 'null'] })).toEqual([
        'maxLength',
      ]);
    });
  });

  it('says nothing about a schema it cannot read', () => {
    expect(compareInputStrictness(undefined, { type: 'string' })).toEqual([]);
    expect(compareInputStrictness({ type: 'string', format: 'uuid' }, true)).toEqual([]);
  });

  it('says nothing when the vendor constrains nothing', () => {
    expect(compareInputStrictness({ type: 'string' }, { type: 'string' })).toEqual([]);
  });
});
