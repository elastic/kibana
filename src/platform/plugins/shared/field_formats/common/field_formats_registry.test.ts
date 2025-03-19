/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldFormatsRegistry } from './field_formats_registry';
import { BoolFormat, PercentFormat, StringFormat } from './converters';
import { FieldFormatConfig, FieldFormatsGetConfigFn } from './types';
import { KBN_FIELD_TYPES } from '@kbn/field-types';

describe('FieldFormatsRegistry', () => {
  let fieldFormatsRegistry: FieldFormatsRegistry;
  let defaultMap: Record<string, FieldFormatConfig> = ({} = {});
  const getConfig = (() => defaultMap) as FieldFormatsGetConfigFn;

  beforeEach(() => {
    fieldFormatsRegistry = new FieldFormatsRegistry();
    fieldFormatsRegistry.init(
      getConfig,
      {
        parsedUrl: {
          origin: '',
          pathname: '',
          basePath: '',
        },
      },
      []
    );
  });

  test('should allows to create an instance of "FieldFormatsRegistry"', () => {
    expect(fieldFormatsRegistry).toBeDefined();
  });

  describe('init', () => {
    test('should provide an public "init" method', () => {
      expect(fieldFormatsRegistry.init).toBeDefined();
      expect(typeof fieldFormatsRegistry.init).toBe('function');
    });

    test('should populate the "defaultMap" object', () => {
      defaultMap = {
        [KBN_FIELD_TYPES.NUMBER]: { id: KBN_FIELD_TYPES.NUMBER, params: {} },
      };

      fieldFormatsRegistry.init(getConfig, {}, []);
      expect(fieldFormatsRegistry.getDefaultConfig(KBN_FIELD_TYPES.NUMBER)).toEqual(
        defaultMap[KBN_FIELD_TYPES.NUMBER]
      );
    });
  });

  describe('register', () => {
    test('should provide an public "register" method', () => {
      expect(fieldFormatsRegistry.register).toBeDefined();
      expect(typeof fieldFormatsRegistry.register).toBe('function');
    });

    test('should register field formats', () => {
      fieldFormatsRegistry.register([StringFormat, BoolFormat]);

      expect(fieldFormatsRegistry.has(StringFormat.id)).toBe(true);
      expect(fieldFormatsRegistry.has(BoolFormat.id)).toBe(true);
      expect(fieldFormatsRegistry.has(PercentFormat.id)).toBe(false);
    });

    test('should throw if registering a formatter with existing id ', () => {
      fieldFormatsRegistry.register([BoolFormat]);

      expect(() => fieldFormatsRegistry.register([BoolFormat])).toThrowErrorMatchingInlineSnapshot(
        `"Failed to register field format with id \\"boolean\\" as it already has been registered"`
      );
    });
  });

  describe('has', () => {
    test('should provide an public "has" method', () => {
      expect(fieldFormatsRegistry.has).toBeDefined();
      expect(typeof fieldFormatsRegistry.has).toBe('function');
    });

    test('should check if field format registered', () => {
      fieldFormatsRegistry.register([StringFormat]);
      expect(fieldFormatsRegistry.has(StringFormat.id)).toBe(true);
      expect(fieldFormatsRegistry.has(BoolFormat.id)).toBe(false);
    });
  });

  describe('getType', () => {
    test('should provide an public "getType" method', () => {
      expect(fieldFormatsRegistry.getType).toBeDefined();
      expect(typeof fieldFormatsRegistry.getType).toBe('function');
    });

    test('should return the registered type of the field format by identifier', () => {
      fieldFormatsRegistry.register([StringFormat]);

      expect(fieldFormatsRegistry.getType(StringFormat.id)).toBeDefined();
    });

    test('should return void if the field format type has not been registered', () => {
      fieldFormatsRegistry.register([BoolFormat]);

      expect(fieldFormatsRegistry.getType(StringFormat.id)).toBeUndefined();
    });
  });

  describe('fieldFormatMetaParamsDecorator', () => {
    test('should set meta params for all instances of FieldFormats', () => {
      fieldFormatsRegistry.register([StringFormat]);

      const DecoratedStingFormat = fieldFormatsRegistry.getType(StringFormat.id);

      expect(DecoratedStingFormat).toBeDefined();

      if (DecoratedStingFormat) {
        const stringFormat = new DecoratedStingFormat({
          foo: 'foo',
        });

        const params = stringFormat.params();
        expect(params).toHaveProperty('foo');
        expect(params).toHaveProperty('parsedUrl');
        expect(params.parsedUrl).toHaveProperty('origin');
        expect(params.parsedUrl).toHaveProperty('pathname');
        expect(params.parsedUrl).toHaveProperty('basePath');
      }
    });

    test('should decorate static fields', () => {
      fieldFormatsRegistry.register([BoolFormat]);

      const DecoratedBoolFormat = fieldFormatsRegistry.getType(BoolFormat.id);

      expect(DecoratedBoolFormat).toBeDefined();

      if (DecoratedBoolFormat) {
        expect(DecoratedBoolFormat.id).toBe(BoolFormat.id);
        expect(DecoratedBoolFormat.fieldType).toBe(BoolFormat.fieldType);
      }
    });
  });

  describe('getByFieldType', () => {
    test('should provide an public "getByFieldType" method', () => {
      expect(fieldFormatsRegistry.getByFieldType).toBeDefined();
      expect(typeof fieldFormatsRegistry.getByFieldType).toBe('function');
    });

    test('should decorate returns types', () => {
      fieldFormatsRegistry.register([StringFormat, BoolFormat]);

      const [DecoratedStringFormat] = fieldFormatsRegistry.getByFieldType(KBN_FIELD_TYPES.STRING);

      expect(DecoratedStringFormat).toBeDefined();

      const stingFormat = new DecoratedStringFormat({ foo: 'foo' });
      const params = stingFormat.params();

      expect(params).toHaveProperty('foo');
      expect(params).toHaveProperty('parsedUrl');
    });
  });
});
