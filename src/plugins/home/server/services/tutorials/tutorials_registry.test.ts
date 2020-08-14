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

import { TutorialsRegistry } from './tutorials_registry';
import { coreMock } from '../../../../../core/server/mocks';
import { CoreSetup } from '../../../../../core/server';
import { httpServerMock } from '../../../../../core/server/mocks';

import {
  TutorialProvider,
  TutorialSchema,
  TutorialsCategory,
  ScopedTutorialContextFactory,
} from './lib/tutorials_registry_types';

const INVALID_TUTORIAL: TutorialSchema = {
  id: 'test',
  category: 'logging' as TutorialsCategory,
  name: '',
  isBeta: false,
  shortDescription: 'short description',
  euiIconType: 'alert',
  longDescription: 'long description with lots of text',
  completionTimeMinutes: 10,
  previewImagePath: 'path',
  onPrem: { instructionSets: [], params: [] },
  elasticCloud: { instructionSets: [], params: [] },
  onPremElasticCloud: { instructionSets: [], params: [] },
  artifacts: {
    exportedFields: { documentationUrl: 'url' },
    dashboards: [],
    application: { path: 'path', label: 'path' },
  },
  savedObjects: [],
  savedObjectsInstallMsg: 'testMsg',
};
const VALID_TUTORIAL: TutorialSchema = {
  id: 'test',
  category: 'logging' as TutorialsCategory,
  name: 'new tutorial provider',
  moduleName: 'test',
  isBeta: false,
  shortDescription: 'short description',
  euiIconType: 'alert',
  longDescription: 'long description with lots of text',
  completionTimeMinutes: 10,
  previewImagePath: 'path',
  onPrem: { instructionSets: [], params: [] },
  elasticCloud: { instructionSets: [], params: [] },
  onPremElasticCloud: { instructionSets: [], params: [] },
  artifacts: {
    exportedFields: { documentationUrl: 'url' },
    dashboards: [],
    application: { path: 'path', label: 'path' },
  },
  savedObjects: [],
  savedObjectsInstallMsg: 'testMsg',
};
const invalidTutorialProvider = INVALID_TUTORIAL;
const validTutorialProvider = VALID_TUTORIAL;

describe('TutorialsRegistry', () => {
  let mockCoreSetup: MockedKeys<CoreSetup>;
  let testProvider: TutorialProvider;
  let testScopedTutorialContextFactory: ScopedTutorialContextFactory;

  describe('GET /api/kibana/home/tutorials', () => {
    beforeEach(() => {
      mockCoreSetup = coreMock.createSetup();
    });

    test('has a router that retrieves registered tutorials', () => {
      const mockResponse = httpServerMock.createResponseFactory();
      expect(mockResponse.ok.mock.calls).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('setup', () => {
    test('exposes proper contract', () => {
      const setup = new TutorialsRegistry().setup(mockCoreSetup);
      expect(setup).toHaveProperty('registerTutorial');
      expect(setup).toHaveProperty('addScopedTutorialContextFactory');
    });

    test('registerTutorial throws when registering a tutorial with an invalid schema', () => {
      const setup = new TutorialsRegistry().setup(mockCoreSetup);
      testProvider = ({}) => invalidTutorialProvider;
      expect(() => setup.registerTutorial(testProvider)).toThrowErrorMatchingInlineSnapshot(
        `"Unable to register tutorial spec because its invalid. ValidationError: child \\"name\\" fails because [\\"name\\" is not allowed to be empty]"`
      );
    });

    test('registerTutorial registers a tutorial with a valid schema', () => {
      const setup = new TutorialsRegistry().setup(mockCoreSetup);
      testProvider = ({}) => validTutorialProvider;
      expect(() => setup.registerTutorial(testProvider)).not.toThrowError();
    });

    test('addScopedTutorialContextFactory throws when given a scopedTutorialContextFactory that is not a function', () => {
      const setup = new TutorialsRegistry().setup(mockCoreSetup);
      const testItem = {} as TutorialProvider;
      expect(() =>
        setup.addScopedTutorialContextFactory(testItem)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Unable to add scoped(request) context factory because you did not provide a function"`
      );
    });

    test('addScopedTutorialContextFactory adds a scopedTutorialContextFactory when given a function', () => {
      const setup = new TutorialsRegistry().setup(mockCoreSetup);
      testScopedTutorialContextFactory = ({}) => 'string';
      expect(() =>
        setup.addScopedTutorialContextFactory(testScopedTutorialContextFactory)
      ).not.toThrowError();
    });
  });

  describe('start', () => {
    test('exposes proper contract', () => {
      const start = new TutorialsRegistry().start();
      expect(start).toBeDefined();
    });
  });
});
