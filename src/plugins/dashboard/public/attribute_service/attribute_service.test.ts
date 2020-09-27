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
        undefined,
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
          customUnwrapMethod: (savedObject) => ({
            ...savedObject.attributes,
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

    it('updates existing saved object with new attributes when given id', async () => {
      const core = coreMock.createStart();
      const attributeService = mockAttributeService<TestAttributes>(
        defaultTestType,
        undefined,
        core
      );
      expect(await attributeService.wrapAttributes(attributes, true, byReferenceInput)).toEqual(
        byReferenceInput
      );
      expect(core.savedObjects.client.update).toHaveBeenCalledWith(
        defaultTestType,
        '123',
        attributes
      );
    });

    it('creates new saved object with attributes when given no id', async () => {
      const core = coreMock.createStart();
      core.savedObjects.client.create = jest.fn().mockResolvedValueOnce({
        id: '678',
      });
      const attributeService = mockAttributeService<TestAttributes>(
        defaultTestType,
        undefined,
        core
      );
      expect(await attributeService.wrapAttributes(attributes, true)).toEqual({
        savedObjectId: '678',
      });
      expect(core.savedObjects.client.create).toHaveBeenCalledWith(defaultTestType, attributes);
    });

    it('uses custom save method when given an id', async () => {
      const customSaveMethod = jest.fn().mockReturnValue({ id: '123' });
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        customSaveMethod,
      });
      expect(await attributeService.wrapAttributes(attributes, true, byReferenceInput)).toEqual(
        byReferenceInput
      );
      expect(customSaveMethod).toHaveBeenCalledWith(
        defaultTestType,
        attributes,
        byReferenceInput.savedObjectId
      );
    });

    it('uses custom save method given no id', async () => {
      const customSaveMethod = jest.fn().mockReturnValue({ id: '678' });
      const attributeService = mockAttributeService<TestAttributes>(defaultTestType, {
        customSaveMethod,
      });
      expect(await attributeService.wrapAttributes(attributes, true)).toEqual({
        savedObjectId: '678',
      });
      expect(customSaveMethod).toHaveBeenCalledWith(defaultTestType, attributes, undefined);
    });
  });
});
