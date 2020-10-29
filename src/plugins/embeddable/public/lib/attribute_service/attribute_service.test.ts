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

import { ATTRIBUTE_SERVICE_KEY } from './attribute_service';
import { mockAttributeService } from './attribute_service.mock';
import { coreMock } from '../../../../../core/public/mocks';
import { OnSaveProps } from 'src/plugins/saved_objects/public/save_modal';

interface TestAttributes {
  title: string;
  testAttr1?: string;
  testAttr2?: { array: unknown[]; testAttr3: string };
}

interface TestByValueInput {
  id: string;
  [ATTRIBUTE_SERVICE_KEY]: TestAttributes;
}

describe('attributeService', () => {
  const defaultTestType = 'defaultTestType';
  let attributes: TestAttributes;
  let byValueInput: TestByValueInput;
  let byReferenceInput: { id: string; savedObjectId: string };
  const defaultSaveMethod = (
    testAttributes: TestAttributes,
    savedObjectId?: string
  ): Promise<{ id: string }> => {
    return new Promise(() => {
      return { id: '123' };
    });
  };
  const defaultUnwrapMethod = (savedObjectId: string): Promise<TestAttributes> => {
    return new Promise(() => {
      return { ...attributes };
    });
  };
  const defaultCheckForDuplicateTitle = (props: OnSaveProps): Promise<true> => {
    return new Promise(() => {
      return true;
    });
  };
  const options = {
    saveMethod: defaultSaveMethod,
    unwrapMethod: defaultUnwrapMethod,
    checkForDuplicateTitle: defaultCheckForDuplicateTitle,
  };

  beforeEach(() => {
    attributes = {
      title: 'ultra title',
      testAttr1: 'neat first attribute',
      testAttr2: { array: [1, 2, 3], testAttr3: 'super attribute' },
    };
    byValueInput = {
      id: '456',
      attributes,
    };
    byReferenceInput = {
      id: '456',
      savedObjectId: '123',
    };
  });

  describe('determining input type', () => {
    const defaultAttributeService = mockAttributeService<TestAttributes>(defaultTestType, options);
    const customAttributeService = mockAttributeService<TestAttributes, TestByValueInput>(
      defaultTestType,
      options
    );

    it('can determine input type given default types', () => {
      expect(
        defaultAttributeService.inputIsRefType({ id: '456', savedObjectId: '123' })
      ).toBeTruthy();
      expect(
        defaultAttributeService.inputIsRefType({
          id: '456',
          attributes: { title: 'wow I am by value' },
        })
      ).toBeFalsy();
    });
    it('can determine input type given custom types', () => {
      expect(
        customAttributeService.inputIsRefType({ id: '456', savedObjectId: '123' })
      ).toBeTruthy();
      expect(
        customAttributeService.inputIsRefType({
          id: '456',
          [ATTRIBUTE_SERVICE_KEY]: { title: 'wow I am by value' },
        })
      ).toBeFalsy();
    });
  });

  describe('unwrapping attributes', () => {
    it('does not throw error when given reference type input with no unwrap method', async () => {
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        saveMethod: defaultSaveMethod,
        checkForDuplicateTitle: jest.fn(),
      });
      expect(await attributeService.unwrapAttributes(byReferenceInput)).toEqual(byReferenceInput);
    });

    it('returns attributes when when given value type input', async () => {
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, options);
      expect(await attributeService.unwrapAttributes(byValueInput)).toEqual(attributes);
    });

    it('runs attributes through a custom unwrap method', async () => {
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        saveMethod: defaultSaveMethod,
        unwrapMethod: (savedObjectId) => {
          return new Promise((resolve) => {
            return resolve({
              ...attributes,
              testAttr2: { array: [1, 2, 3, 4, 5], testAttr3: 'kibanana' },
            });
          });
        },
        checkForDuplicateTitle: jest.fn(),
      });
      expect(await attributeService.unwrapAttributes(byReferenceInput)).toEqual({
        ...attributes,
        testAttr2: { array: [1, 2, 3, 4, 5], testAttr3: 'kibanana' },
      });
    });
  });

  describe('wrapping attributes', () => {
    it('returns given attributes when use ref type is false', async () => {
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, options);
      expect(await attributeService.wrapAttributes(attributes, false)).toEqual({ attributes });
    });

    it('calls saveMethod with appropriate parameters', async () => {
      const core = coreMock.createStart();
      const saveMethod = jest.fn();
      saveMethod.mockReturnValueOnce({});
      const attributeService = mockAttributeService<TestAttributes>(
        defaultTestType,
        {
          saveMethod,
          unwrapMethod: defaultUnwrapMethod,
          checkForDuplicateTitle: defaultCheckForDuplicateTitle,
        },
        core
      );
      expect(await attributeService.wrapAttributes(attributes, true, byReferenceInput)).toEqual(
        byReferenceInput
      );
      expect(saveMethod).toHaveBeenCalledWith(attributes, '123');
    });

    it('uses custom save method when given an id', async () => {
      const saveMethod = jest.fn().mockReturnValue({ id: '123' });
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        saveMethod,
        unwrapMethod: defaultUnwrapMethod,
        checkForDuplicateTitle: defaultCheckForDuplicateTitle,
      });
      expect(await attributeService.wrapAttributes(attributes, true, byReferenceInput)).toEqual(
        byReferenceInput
      );
      expect(saveMethod).toHaveBeenCalledWith(attributes, byReferenceInput.savedObjectId);
    });

    it('uses custom save method given no id', async () => {
      const saveMethod = jest.fn().mockReturnValue({ id: '678' });
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        saveMethod,
        unwrapMethod: defaultUnwrapMethod,
        checkForDuplicateTitle: defaultCheckForDuplicateTitle,
      });
      expect(await attributeService.wrapAttributes(attributes, true)).toEqual({
        savedObjectId: '678',
      });
      expect(saveMethod).toHaveBeenCalledWith(attributes, undefined);
    });
  });
});
