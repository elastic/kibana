/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { Tutorial } from './tutorial';
import { TutorialType } from '../../../services/tutorials/types';

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    http: {
      post: jest.fn().mockImplementation(async () => ({ count: 0 })),
      basePath: { prepend: (path: string) => `/foo/${path}` },
    },
    getBasePath: jest.fn(() => 'path'),
    chrome: {
      setBreadcrumbs: () => {},
    },
    tutorialService: {
      getModuleNotices: () => [],
      getCustomComponent: jest.fn(),
      getCustomStatusCheck: (
        name: 'custom_status_check_has_data' | 'custom_status_check_no_data'
      ) => {
        const customStatusCheckMock = {
          custom_status_check_has_data: async () => true,
          custom_status_check_no_data: async () => false,
        };
        return customStatusCheckMock[name];
      },
    },
  }),
}));

function buildInstructionSet(type: string) {
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
        statusCheck: {
          title: 'Status Check title',
        },
      },
    ],
  };
}

const tutorial = {
  id: 'someid',
  name: 'jest test tutorial',
  elasticCloud: buildInstructionSet('elasticCloud'),
  onPrem: buildInstructionSet('onPrem'),
  onPremElasticCloud: buildInstructionSet('onPremElasticCloud'),
  longDescription: 'tutorial used to drive jest tests',
  euiIconType: 'logoApache',
  customStatusCheckName: 'custom_status_check_has_data',
};
const loadTutorialPromise = Promise.resolve(tutorial);
const getTutorial = (id: string) => {
  return loadTutorialPromise as Promise<TutorialType>;
};
const addBasePath = (path: string) => {
  return `BASE_PATH/${path}`;
};
const replaceTemplateStrings = (text: string) => {
  return text;
};

describe('Tutorial component', () => {
  describe('when isCloudEnabled is false', () => {
    test('should render ON_PREM instructions with instruction toggle', async () => {
      const { getByText } = render(
        <I18nProvider>
          <Tutorial
            addBasePath={addBasePath}
            isCloudEnabled={false}
            getTutorial={getTutorial}
            replaceTemplateStrings={replaceTemplateStrings}
            tutorialId={'my_testing_tutorial'}
          />
        </I18nProvider>
      );

      await act(async () => {
        await loadTutorialPromise;
      });

      expect(getByText('onPrem instructions')).toBeInTheDocument();
    });

    test('should not render instruction toggle when ON_PREM_ELASTIC_CLOUD instructions are not provided', async () => {
      const loadBasicTutorialPromise = Promise.resolve({
        name: 'jest test tutorial',
        longDescription: 'tutorial used to drive jest tests',
        elasticCloud: buildInstructionSet('elasticCloud'),
        onPrem: buildInstructionSet('onPrem'),
      });
      const getBasicTutorial = () => {
        return loadBasicTutorialPromise as unknown as Promise<TutorialType>;
      };
      const { queryByTestId } = render(
        <I18nProvider>
          <Tutorial
            addBasePath={addBasePath}
            isCloudEnabled={false}
            getTutorial={getBasicTutorial}
            replaceTemplateStrings={replaceTemplateStrings}
            tutorialId={'my_testing_tutorial'}
          />
        </I18nProvider>
      );
      await act(async () => {
        await loadBasicTutorialPromise;
      });

      expect(queryByTestId('selfManagedTutorial')).not.toBeInTheDocument();
      expect(queryByTestId('onCloudTutorial')).not.toBeInTheDocument();
    });

    test('should display ON_PREM_ELASTIC_CLOUD instructions when toggle is clicked', async () => {
      const { getByTestId, getByText } = render(
        <I18nProvider>
          <Tutorial
            addBasePath={addBasePath}
            isCloudEnabled={false}
            getTutorial={getTutorial}
            replaceTemplateStrings={replaceTemplateStrings}
            tutorialId={'my_testing_tutorial'}
          />
        </I18nProvider>
      );
      await act(async () => {
        await loadTutorialPromise;
      });

      fireEvent.click(getByTestId('onCloudTutorial'));

      await waitFor(() => {
        expect(getByText('onPremElasticCloud instructions')).toBeInTheDocument();
      });
    });
  });

  describe('when isCloudEnabled is true', () => {
    test('should render ELASTIC_CLOUD instructions', async () => {
      const { getByText } = render(
        <I18nProvider>
          <Tutorial
            addBasePath={addBasePath}
            isCloudEnabled={true}
            getTutorial={getTutorial}
            replaceTemplateStrings={replaceTemplateStrings}
            tutorialId={'my_testing_tutorial'}
          />
        </I18nProvider>
      );
      await act(async () => {
        await loadTutorialPromise;
      });

      expect(getByText('elasticCloud instructions')).toBeInTheDocument();
    });
  });

  describe('custom status check', () => {
    test('should update statusCheckStates correctly on status check', async () => {
      const { getByText, getByTestId } = render(
        <I18nProvider>
          <Tutorial
            addBasePath={addBasePath}
            isCloudEnabled={false}
            getTutorial={getTutorial}
            replaceTemplateStrings={replaceTemplateStrings}
            tutorialId={'my_testing_tutorial'}
          />
        </I18nProvider>
      );

      await act(async () => {
        await loadTutorialPromise;
      });

      // Simulate status check
      fireEvent.click(getByTestId('statusCheckButton'));
      await waitFor(() => {
        expect(getByText('Success')).toBeInTheDocument();
      });
    });

    test('should update statusCheckStates correctly on status check failure', async () => {
      const tutorialWithNoDataCheck = {
        ...tutorial,
        customStatusCheckName: 'custom_status_check_no_data',
      };
      const loadTutorialWithNoDataCheckPromise = Promise.resolve(tutorialWithNoDataCheck);
      const getTutorialWithNoDataCheck = (id: string) => {
        return loadTutorialWithNoDataCheckPromise as Promise<TutorialType>;
      };

      const { getByText, getByTestId } = render(
        <I18nProvider>
          <Tutorial
            addBasePath={addBasePath}
            isCloudEnabled={false}
            getTutorial={getTutorialWithNoDataCheck}
            replaceTemplateStrings={replaceTemplateStrings}
            tutorialId={'my_testing_tutorial'}
          />
        </I18nProvider>
      );
      await act(async () => {
        await loadTutorialWithNoDataCheckPromise;
      });

      // Simulate status check
      fireEvent.click(getByTestId('statusCheckButton'));
      await waitFor(() => {
        expect(getByText('No data found')).toBeInTheDocument();
      });
    });
  });
});
