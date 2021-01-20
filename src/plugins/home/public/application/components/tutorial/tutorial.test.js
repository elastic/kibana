/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from '@kbn/test/jest';

import { Tutorial } from './tutorial';

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    getBasePath: jest.fn(() => 'path'),
    chrome: {
      setBreadcrumbs: () => {},
    },
    tutorialService: {
      getModuleNotices: () => [],
    },
  }),
}));
jest.mock('../../../../../kibana_react/public', () => {
  return {
    Markdown: () => <div className="markdown" />,
  };
});

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
              },
            ],
          },
        ],
      },
    ],
  };
}
const tutorial = {
  name: 'jest test tutorial',
  longDescription: 'tutorial used to drive jest tests',
  euiIconType: 'logoApache',
  elasticCloud: buildInstructionSet('elasticCloud'),
  onPrem: buildInstructionSet('onPrem'),
  onPremElasticCloud: buildInstructionSet('onPremElasticCloud'),
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
  test('should render ON_PREM instructions with instruction toggle', async () => {
    const component = shallowWithIntl(
      <Tutorial.WrappedComponent
        addBasePath={addBasePath}
        isCloudEnabled={false}
        getTutorial={getTutorial}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={'my_testing_tutorial'}
        bulkCreate={() => {}}
      />
    );
    await loadTutorialPromise;

    component.update();
    expect(component).toMatchSnapshot();
  });

  test('should not render instruction toggle when ON_PREM_ELASTIC_CLOUD instructions are not provided', async () => {
    const loadBasicTutorialPromise = Promise.resolve({
      name: 'jest test tutorial',
      longDescription: 'tutorial used to drive jest tests',
      elasticCloud: buildInstructionSet('elasticCloud'),
      onPrem: buildInstructionSet('onPrem'),
    });
    const getBasicTutorial = () => {
      return loadBasicTutorialPromise;
    };
    const component = shallowWithIntl(
      <Tutorial.WrappedComponent
        addBasePath={addBasePath}
        isCloudEnabled={false}
        getTutorial={getBasicTutorial}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={'my_testing_tutorial'}
        bulkCreate={() => {}}
      />
    );
    await loadBasicTutorialPromise;
    component.update();
    expect(component).toMatchSnapshot();
  });

  test('should display ON_PREM_ELASTIC_CLOUD instructions when toggle is clicked', async () => {
    const component = mountWithIntl(
      <Tutorial.WrappedComponent
        addBasePath={addBasePath}
        isCloudEnabled={false}
        getTutorial={getTutorial}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={'my_testing_tutorial'}
        bulkCreate={() => {}}
      />
    );
    await loadTutorialPromise;
    component.update();
    component.find('#onPremElasticCloud').first().simulate('click');
    component.update();
    expect(component.state('visibleInstructions')).toBe('onPremElasticCloud');
  });
});

test('should render ELASTIC_CLOUD instructions when isCloudEnabled is true', async () => {
  const component = shallowWithIntl(
    <Tutorial.WrappedComponent
      addBasePath={addBasePath}
      isCloudEnabled={true}
      getTutorial={getTutorial}
      replaceTemplateStrings={replaceTemplateStrings}
      tutorialId={'my_testing_tutorial'}
      bulkCreate={() => {}}
    />
  );
  await loadTutorialPromise;
  component.update();
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
