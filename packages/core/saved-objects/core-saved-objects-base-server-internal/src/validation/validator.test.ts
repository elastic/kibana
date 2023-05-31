/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type {
  SavedObjectSanitizedDoc,
  SavedObjectsValidationSpec,
  SavedObjectsValidationMap,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsTypeValidator } from './validator';

const defaultVersion = '3.3.0';
const type = 'my-type';

describe('Saved Objects type validator', () => {
  let validator: SavedObjectsTypeValidator;
  let logger: MockedLogger;
  let validationMap: SavedObjectsValidationMap;

  const createMockObject = (parts: Partial<SavedObjectSanitizedDoc>): SavedObjectSanitizedDoc => ({
    type,
    id: 'test-id',
    references: [],
    attributes: {},
    ...parts,
  });

  beforeEach(() => {
    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('validation behavior', () => {
    beforeEach(() => {
      validationMap = {
        '1.0.0': schema.object({
          foo: schema.string(),
        }),
      };
      validator = new SavedObjectsTypeValidator({ logger, type, validationMap, defaultVersion });
    });

    it('should log when a validation fails', () => {
      const data = createMockObject({ attributes: { foo: false } });
      expect(() => validator.validate(data, '1.0.0')).toThrowError();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('should work when given valid values', () => {
      const data = createMockObject({ attributes: { foo: 'hi' } });
      expect(() => validator.validate(data, '1.0.0')).not.toThrowError();
    });

    it('should throw an error when given invalid values', () => {
      const data = createMockObject({ attributes: { foo: false } });
      expect(() => validator.validate(data, '1.0.0')).toThrowErrorMatchingInlineSnapshot(
        `"[attributes.foo]: expected value of type [string] but got [boolean]"`
      );
    });

    it('should throw an error if fields other than attributes are malformed', () => {
      const data = createMockObject({ attributes: { foo: 'hi' } });
      // @ts-expect-error Intentionally malformed object
      data.updated_at = false;
      expect(() => validator.validate(data, '1.0.0')).toThrowErrorMatchingInlineSnapshot(
        `"[updated_at]: expected value of type [string] but got [boolean]"`
      );
    });

    it('works when the validation map is a function', () => {
      const fnValidationMap: () => SavedObjectsValidationMap = () => validationMap;
      validator = new SavedObjectsTypeValidator({
        logger,
        type,
        validationMap: fnValidationMap,
        defaultVersion,
      });

      const data = createMockObject({ attributes: { foo: 'hi' } });
      expect(() => validator.validate(data, '1.0.0')).not.toThrowError();
    });
  });

  describe('schema selection', () => {
    beforeEach(() => {
      validationMap = {
        '2.0.0': createStubSpec(), // version keys have to be valid kibana versions. These are not
        '2.7.0': createStubSpec(),
        '3.0.0': createStubSpec(),
        '3.5.0': createStubSpec(), // higher than default, should fall back to default
        '4.0.0': createStubSpec(),
        '4.3.0': createStubSpec(),
        '10.1.0': createStubSpec(),
        '11.1.4': createStubSpec(),
      };
      validator = new SavedObjectsTypeValidator({ logger, type, validationMap, defaultVersion });
    });

    const createStubSpec = (): jest.Mocked<SavedObjectsValidationSpec> => {
      const stub = schema.object({}, { unknowns: 'allow', defaultValue: {} });
      jest.spyOn(stub as any, 'getSchema');
      return stub as jest.Mocked<SavedObjectsValidationSpec>;
    };

    const getCalledVersion = () => {
      for (const [version, validation] of Object.entries(validationMap)) {
        if (((validation as any).getSchema as jest.MockedFn<any>).mock.calls.length > 0) {
          return version;
        }
      }
      return undefined;
    };

    it('should use the correct schema when specifying the version', () => {
      let data = createMockObject({ typeMigrationVersion: '2.2.0' });
      validator.validate(data, '3.2.0');
      expect(getCalledVersion()).toEqual('3.0.0');

      jest.clearAllMocks();

      data = createMockObject({ typeMigrationVersion: '3.5.0' });
      validator.validate(data, '4.5.0');
      expect(getCalledVersion()).toEqual('4.3.0');
    });

    it('should use the correct schema for documents with typeMigrationVersion', () => {
      const data = createMockObject({ typeMigrationVersion: '3.2.0' });
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0'); // falls back to most recent since 3.2.0
    });

    it('should use the correct schema for documents with typeMigrationVersion higher than default when not a valid virtual model version', () => {
      const data = createMockObject({ typeMigrationVersion: '3.5.0' }); // should fall back to most recent since 3.5.0 > default && not a virtual model
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0');
    });

    it('should use the fall back schema for documents with migrationVersion', () => {
      let data = createMockObject({
        migrationVersion: {
          [type]: '4.6.0',
        },
      });
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0');

      jest.clearAllMocks();

      data = createMockObject({
        migrationVersion: {
          [type]: '3.0.0',
        },
      });
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0');
    });

    it('should use the correct schema for documents with migrationVersion higher than default when not a valid virtual model version', () => {
      let data = createMockObject({
        migrationVersion: {
          [type]: '4.6.0',
        },
      });
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0');

      jest.clearAllMocks();

      data = createMockObject({
        migrationVersion: {
          [type]: '3.0.0',
        },
      });
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0');
    });

    it('should use the correct schema for documents with virtualModelVersion', () => {
      const data = createMockObject({ typeMigrationVersion: '10.1.0' }); // allowed
      validator.validate(data);
      expect(getCalledVersion()).toEqual('10.1.0');
    });

    it('should use the correct schema for documents with with virtualModelVersion higher than default when not a valid virtual model version', () => {
      const data = createMockObject({ typeMigrationVersion: '11.1.4' }); // not allowed
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0');
    });

    it('should use the correct schema for documents without a version specified', () => {
      const data = createMockObject({});
      validator.validate(data);
      expect(getCalledVersion()).toEqual('3.0.0');
    });
  });
});
