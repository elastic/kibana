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
import { mockAttributeService } from './attribute_service_mock';
import { coreMock } from '../../../../core/public/mocks';

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
  const defaultSaveMethod = jest.fn();
  const defaultUnwrapMethod = (savedObjectId: string) => ({
    ...attributes,
  });

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
    const defaultAttributeService = mockAttributeService<TestAttributes>(defaultTestType);
    const customAttributeService = mockAttributeService<TestAttributes, TestByValueInput>(
      defaultTestType
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
    it('can unwrap all default attributes when given reference type input', async () => {
      const core = coreMock.createStart();
      core.savedObjects.client.get = jest.fn().mockResolvedValueOnce({
        attributes,
      });
      const attributeService = mockAttributeService<TestAttributes>(
        defaultTestType,
        {
          saveMethod: defaultSaveMethod,
          unwrapMethod: (savedObjectId) => ({
            ...attributes,
          }),
        },
        core
      );
      expect(await attributeService.unwrapAttributes(byReferenceInput)).toEqual(attributes);
    });

    it('returns attributes when when given value type input', async () => {
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType);
      expect(await attributeService.unwrapAttributes(byValueInput)).toEqual(attributes);
    });

    it('runs attributes through a custom unwrap method', async () => {
      const core = coreMock.createStart();
      core.savedObjects.client.get = jest.fn().mockResolvedValueOnce({
        attributes,
      });
      const attributeService = mockAttributeService<TestAttributes>(
        defaultTestType,
        {
          saveMethod: defaultSaveMethod,
          unwrapMethod: (savedObjectId) => ({
            ...attributes,
            testAttr2: { array: [1, 2, 3, 4, 5], testAttr3: 'kibanana' },
          }),
        },
        core
      );
      expect(await attributeService.unwrapAttributes(byReferenceInput)).toEqual({
        ...attributes,
        testAttr2: { array: [1, 2, 3, 4, 5], testAttr3: 'kibanana' },
      });
    });
  });

  describe('wrapping attributes', () => {
    it('returns given attributes when use ref type is false', async () => {
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType);
      expect(await attributeService.wrapAttributes(attributes, false)).toEqual({ attributes });
    });

    it('calls saveMethod with appropriate parameters', async () => {
      const core = coreMock.createStart();
      const saveMethod = jest.fn();
      saveMethod.mockReturnValueOnce({});
      const attributeService = mockAttributeService<TestAttributes>(
        defaultTestType,
        { saveMethod, unwrapMethod: defaultUnwrapMethod },
        core
      );
      expect(await attributeService.wrapAttributes(attributes, true, byReferenceInput)).toEqual(
        byReferenceInput
      );
      expect(saveMethod).toHaveBeenCalledWith(defaultTestType, attributes, '123');
    });

    it('uses custom save method when given an id', async () => {
      const saveMethod = jest.fn().mockReturnValue({ id: '123' });
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        saveMethod,
        unwrapMethod: defaultUnwrapMethod,
      });
      expect(await attributeService.wrapAttributes(attributes, true, byReferenceInput)).toEqual(
        byReferenceInput
      );
      expect(saveMethod).toHaveBeenCalledWith(
        defaultTestType,
        attributes,
        byReferenceInput.savedObjectId
      );
    });

    it('uses custom save method given no id', async () => {
      const saveMethod = jest.fn().mockReturnValue({ id: '678' });
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        saveMethod,
        unwrapMethod: defaultUnwrapMethod,
      });
      expect(await attributeService.wrapAttributes(attributes, true)).toEqual({
        savedObjectId: '678',
      });
      expect(saveMethod).toHaveBeenCalledWith(defaultTestType, attributes, undefined);
    });
  });
});
