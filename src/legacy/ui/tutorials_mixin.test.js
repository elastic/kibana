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

import { tutorialsMixin } from './tutorials_mixin';

const validTutorial = {
  id: 'spec1',
  category: 'other',
  name: 'spec1',
  shortDescription: 'short description',
  longDescription: 'long description',
  onPrem: {
    instructionSets: [
      {
        instructionVariants: [
          {
            id: 'instructionVariant1',
            instructions: [{}],
          },
        ],
      },
    ],
  },
};

describe('tutorial mixins', () => {
  let getTutorials;
  let registerTutorial;
  let addScopedTutorialContextFactory;
  const serverMock = { decorate: jest.fn() };
  beforeEach(async () => {
    await tutorialsMixin({}, serverMock);

    [
      [, , getTutorials],
      [, , registerTutorial],
      [, , addScopedTutorialContextFactory],
    ] = serverMock.decorate.mock.calls;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scoped context', () => {
    const mockRequest = {};
    const spacesContextFactory = request => {
      if (request !== mockRequest) {
        throw new Error('context factory not called with request object');
      }
      return {
        spaceId: 'my-space',
      };
    };
    const specProvider = (server, context) => {
      const tutorial = { ...validTutorial };
      tutorial.shortDescription = `I have been provided with scoped context, spaceId: ${context.spaceId}`;
      return tutorial;
    };
    beforeEach(async () => {
      addScopedTutorialContextFactory(spacesContextFactory);
      registerTutorial(specProvider);
    });

    test('passes scoped context to specProviders', () => {
      const tutorials = getTutorials(mockRequest);
      expect(tutorials.length).toBe(1);
      expect(tutorials[0].shortDescription).toBe(
        'I have been provided with scoped context, spaceId: my-space'
      );
    });
  });
});
