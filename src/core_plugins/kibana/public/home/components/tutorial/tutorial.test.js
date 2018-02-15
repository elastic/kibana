import React from 'react';
import { shallow, mount } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';

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
    const component = shallow(<Tutorial
      addBasePath={addBasePath}
      isCloudEnabled={false}
      getTutorial={getTutorial}
      replaceTemplateStrings={replaceTemplateStrings}
      tutorialId={'my_testing_tutorial'}
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
    const component = shallow(<Tutorial
      addBasePath={addBasePath}
      isCloudEnabled={false}
      getTutorial={getBasicTutorial}
      replaceTemplateStrings={replaceTemplateStrings}
      tutorialId={'my_testing_tutorial'}
    />);
    loadBasicTutorialPromise.then(() => {
      component.update();
      expect(component).toMatchSnapshot(); // eslint-disable-line
    });
  });

  test('should display ON_PREM_ELASTIC_CLOUD instructions when toggle is clicked', () => {
    const component = mount(<Tutorial
      addBasePath={addBasePath}
      isCloudEnabled={false}
      getTutorial={getTutorial}
      replaceTemplateStrings={replaceTemplateStrings}
      tutorialId={'my_testing_tutorial'}
    />);
    loadTutorialPromise.then(() => {
      component.update();
      findTestSubject(component, 'onPremElasticCloudBtn').simulate('click');
      expect(component.state('visibleInstructions')).toBe('onPremElasticCloud');
    });
  });

});

test('should render ELASTIC_CLOUD instructions when isCloudEnabled is true', () => {
  const component = shallow(<Tutorial
    addBasePath={addBasePath}
    isCloudEnabled={true}
    getTutorial={getTutorial}
    replaceTemplateStrings={replaceTemplateStrings}
    tutorialId={'my_testing_tutorial'}
  />);
  loadTutorialPromise.then(() => {
    component.update();
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
