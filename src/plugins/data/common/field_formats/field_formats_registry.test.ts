/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { FieldFormatRegisty } from './field_formats_registry';
import { BoolFormat, PercentFormat, StringFormat } from './converters';
import { IFieldFormatType } from './field_format';
import { KBN_FIELD_TYPES } from '../../common';

const getValueOfPrivateField = (instance: any, field: string) => instance[field];

describe('FieldFormatRegisty', () => {
  let fieldFormatRegisty: FieldFormatRegisty;
  let defaultMap = {};
  const getConfig = (key: string) => defaultMap;

  beforeEach(() => {
    fieldFormatRegisty = new FieldFormatRegisty();
    fieldFormatRegisty.init(
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

  test('should allows to create an instance of "FieldFormatRegisty"', () => {
    expect(fieldFormatRegisty).toBeDefined();

    expect(getValueOfPrivateField(fieldFormatRegisty, 'fieldFormats')).toBeDefined();
    expect(getValueOfPrivateField(fieldFormatRegisty, 'defaultMap')).toEqual({});
  });

  describe('init', () => {
    test('should provide an public "init" method', () => {
      expect(fieldFormatRegisty.init).toBeDefined();
      expect(typeof fieldFormatRegisty.init).toBe('function');
    });

    test('should populate the "defaultMap" object', () => {
      defaultMap = {
        number: { id: 'number', params: {} },
      };

      fieldFormatRegisty.init(getConfig, {}, []);
      expect(getValueOfPrivateField(fieldFormatRegisty, 'defaultMap')).toEqual(defaultMap);
    });
  });

  describe('register', () => {
    test('should provide an public "register" method', () => {
      expect(fieldFormatRegisty.register).toBeDefined();
      expect(typeof fieldFormatRegisty.register).toBe('function');
    });

    test('should register field formats', () => {
      fieldFormatRegisty.register([StringFormat, BoolFormat]);

      const registeredFieldFormatters: Map<string, IFieldFormatType> = getValueOfPrivateField(
        fieldFormatRegisty,
        'fieldFormats'
      );

      expect(registeredFieldFormatters.size).toBe(2);

      expect(registeredFieldFormatters.get(BoolFormat.id)).toBe(BoolFormat);
      expect(registeredFieldFormatters.get(StringFormat.id)).toBe(StringFormat);
      expect(registeredFieldFormatters.get(PercentFormat.id)).toBeUndefined();
    });
  });

  describe('getType', () => {
    test('should provide an public "getType" method', () => {
      expect(fieldFormatRegisty.getType).toBeDefined();
      expect(typeof fieldFormatRegisty.getType).toBe('function');
    });

    test('should return the registered type of the field format by identifier', () => {
      fieldFormatRegisty.register([StringFormat]);

      expect(fieldFormatRegisty.getType(StringFormat.id)).toBeDefined();
    });

    test('should return void if the field format type has not been registered', () => {
      fieldFormatRegisty.register([BoolFormat]);

      expect(fieldFormatRegisty.getType(StringFormat.id)).toBeUndefined();
    });
  });

  describe('fieldFormatMetaParamsDecorator', () => {
    test('should set meta params for all instances of FieldFormats', () => {
      fieldFormatRegisty.register([StringFormat]);

      const DecoratedStingFormat = fieldFormatRegisty.getType(StringFormat.id);

      expect(DecoratedStingFormat).toBeDefined();

      if (DecoratedStingFormat) {
        const stringFormat = new DecoratedStingFormat({
          foo: 'foo',
        });
        const params = getValueOfPrivateField(stringFormat, '_params');

        expect(params).toHaveProperty('foo');
        expect(params).toHaveProperty('parsedUrl');
        expect(params.parsedUrl).toHaveProperty('origin');
        expect(params.parsedUrl).toHaveProperty('pathname');
        expect(params.parsedUrl).toHaveProperty('basePath');
      }
    });

    test('should decorate static fields', () => {
      fieldFormatRegisty.register([BoolFormat]);

      const DecoratedBoolFormat = fieldFormatRegisty.getType(BoolFormat.id);

      expect(DecoratedBoolFormat).toBeDefined();

      if (DecoratedBoolFormat) {
        expect(DecoratedBoolFormat.id).toBe(BoolFormat.id);
        expect(DecoratedBoolFormat.fieldType).toBe(BoolFormat.fieldType);
      }
    });
  });

  describe('getByFieldType', () => {
    test('should provide an public "getByFieldType" method', () => {
      expect(fieldFormatRegisty.getByFieldType).toBeDefined();
      expect(typeof fieldFormatRegisty.getByFieldType).toBe('function');
    });

    test('should decorate returns types', () => {
      fieldFormatRegisty.register([StringFormat, BoolFormat]);

      const [DecoratedStringFormat] = fieldFormatRegisty.getByFieldType(KBN_FIELD_TYPES.STRING);

      expect(DecoratedStringFormat).toBeDefined();

      const stingFormat = new DecoratedStringFormat({ foo: 'foo' });
      const params = getValueOfPrivateField(stingFormat, '_params');

      expect(params).toHaveProperty('foo');
      expect(params).toHaveProperty('parsedUrl');
    });
  });
});
