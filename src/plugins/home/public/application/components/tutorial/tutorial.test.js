/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';

import { Tutorial } from './tutorial';

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    http: {
      post: jest.fn().mockImplementation(async () => ({ count: 1 })),
      basePath: { prepend: (path) => `/foo/${path}` },
    },
    getBasePath: jest.fn(() => 'path'),
    chrome: {
      setBreadcrumbs: () => {},
    },
    tutorialService: {
      getModuleNotices: () => [],
      getCustomComponent: jest.fn(),
      getCustomStatusCheck: (name) => {
        const customStatusCheckMock = {
          custom_status_check_has_data: async () => true,
          custom_status_check_no_data: async () => false,
        };
        return customStatusCheckMock[name];
      },
    },
  }),
}));

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
  customStatusCheckName: 'custom_status_check_has_data',
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
    component.find('#onPremElasticCloud').first().find('input').simulate('change');
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

describe('custom status check', () => {
  test('should return has_data when custom status check callback is set and returns true', async () => {
    const component = mountWithIntl(
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
    await component.instance().checkInstructionSetStatus(0);
    expect(component.state('statusCheckStates')[0]).toEqual('has_data');
  });
  test('should return no_data when custom status check callback is set and returns false', async () => {
    const tutorialWithCustomStatusCheckNoData = {
      ...tutorial,
      customStatusCheckName: 'custom_status_check_no_data',
    };
    const component = mountWithIntl(
      <Tutorial.WrappedComponent
        addBasePath={addBasePath}
        isCloudEnabled={true}
        getTutorial={async () => tutorialWithCustomStatusCheckNoData}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={'my_testing_tutorial'}
        bulkCreate={() => {}}
      />
    );
    await loadTutorialPromise;
    component.update();
    await component.instance().checkInstructionSetStatus(0);
    expect(component.state('statusCheckStates')[0]).toEqual('NO_DATA');
  });

  test('should return no_data when custom status check callback is not defined', async () => {
    const tutorialWithoutCustomStatusCheck = {
      ...tutorial,
      customStatusCheckName: undefined,
    };
    const component = mountWithIntl(
      <Tutorial.WrappedComponent
        addBasePath={addBasePath}
        isCloudEnabled={true}
        getTutorial={async () => tutorialWithoutCustomStatusCheck}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={'my_testing_tutorial'}
        bulkCreate={() => {}}
      />
    );
    await loadTutorialPromise;
    component.update();
    await component.instance().checkInstructionSetStatus(0);
    expect(component.state('statusCheckStates')[0]).toEqual('NO_DATA');
  });

  test('should return has_data if esHits or customStatusCheck returns true', async () => {
    const { instructionSets } = tutorial.elasticCloud;
    const tutorialWithStatusCheckAndCustomStatusCheck = {
      ...tutorial,
      customStatusCheckName: undefined,
      elasticCloud: {
        instructionSets: [
          {
            ...instructionSets[0],
            statusCheck: {
              title: 'check status',
              text: 'check status',
              esHitsCheck: {
                index: 'foo',
                query: {
                  bool: {
                    filter: [{ term: { 'processor.event': 'onboarding' } }],
                  },
                },
              },
            },
          },
        ],
      },
    };
    const component = mountWithIntl(
      <Tutorial.WrappedComponent
        addBasePath={addBasePath}
        isCloudEnabled={true}
        getTutorial={async () => tutorialWithStatusCheckAndCustomStatusCheck}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={'my_testing_tutorial'}
        bulkCreate={() => {}}
      />
    );
    await loadTutorialPromise;
    component.update();
    await component.instance().checkInstructionSetStatus(0);
    expect(component.state('statusCheckStates')[0]).toEqual('has_data');
  });
});
