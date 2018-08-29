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

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';

import {
  Tutorial,
} from './tutorial';

function buildInstructionSet(type) {
  return {
    instructionSets: [
      {
        title: 'Instruction title',
        instructionVariants: [
          {
            id: 'platform id',
            instructions: [
              {
                title: `${type} instructions`,
              }
            ]
          }
        ]
      }
    ]
  };
}
const tutorial = {
  name: 'jest test tutorial',
  longDescription: 'tutorial used to drive jest tests',
  euiIconType: 'logoApache',
  elasticCloud: buildInstructionSet('elasticCloud'),
  onPrem: buildInstructionSet('onPrem'),
  onPremElasticCloud: buildInstructionSet('onPremElasticCloud')
};
const loadTutorialPromise = Promise.resolve(tutorial);
const getTutorial = () => {
  return loadTutorialPromise;
};
const addBasePath = (path) => {
  return `BASE_PATH/${path}`;
};
const replaceTemplateStrings = (text) => {
  return text;
};

describe('isCloudEnabled is false', () => {
  test('should render ON_PREM instructions with instruction toggle', () => {
    const component = shallowWithIntl(<Tutorial.WrappedComponent
      addBasePath={addBasePath}
      isCloudEnabled={false}
      getTutorial={getTutorial}
      replaceTemplateStrings={replaceTemplateStrings}
      tutorialId={'my_testing_tutorial'}
      bulkCreate={() => {}}
    />);
    loadTutorialPromise.then(() => {
      component.update();
      expect(component).toMatchSnapshot(); // eslint-disable-line
    });
  });

  test('should not render instruction toggle when ON_PREM_ELASTIC_CLOUD instructions are not provided', () => {
    const loadBasicTutorialPromise = Promise.resolve({
      name: 'jest test tutorial',
      longDescription: 'tutorial used to drive jest tests',
      elasticCloud: buildInstructionSet('elasticCloud'),
      onPrem: buildInstructionSet('onPrem')
    });
    const getBasicTutorial = () => {
      return loadBasicTutorialPromise;
    };
    const component = shallowWithIntl(<Tutorial.WrappedComponent
      addBasePath={addBasePath}
      isCloudEnabled={false}
      getTutorial={getBasicTutorial}
      replaceTemplateStrings={replaceTemplateStrings}
      tutorialId={'my_testing_tutorial'}
      bulkCreate={() => {}}
    />);
    loadBasicTutorialPromise.then(() => {
      component.update();
      expect(component).toMatchSnapshot(); // eslint-disable-line
    });
  });

  test('should display ON_PREM_ELASTIC_CLOUD instructions when toggle is clicked', () => {
    const component = mountWithIntl(<Tutorial.WrappedComponent
      addBasePath={addBasePath}
      isCloudEnabled={false}
      getTutorial={getTutorial}
      replaceTemplateStrings={replaceTemplateStrings}
      tutorialId={'my_testing_tutorial'}
      bulkCreate={() => {}}
    />);
    loadTutorialPromise.then(() => {
      component.update();
      findTestSubject(component, 'onPremElasticCloudBtn').simulate('click');
      expect(component.state('visibleInstructions')).toBe('onPremElasticCloud');
    });
  });

});

test('should render ELASTIC_CLOUD instructions when isCloudEnabled is true', () => {
  const component = shallowWithIntl(<Tutorial.WrappedComponent
    addBasePath={addBasePath}
    isCloudEnabled={true}
    getTutorial={getTutorial}
    replaceTemplateStrings={replaceTemplateStrings}
    tutorialId={'my_testing_tutorial'}
    bulkCreate={() => {}}
  />);
  loadTutorialPromise.then(() => {
    component.update();
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
