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
import { fireEvent, render, waitFor } from '@testing-library/react';
import { SavedObjectsBatchResponse } from '@kbn/core-saved-objects-api-browser';
import { Tutorial } from './tutorial';
import { TutorialType } from '../../../services/tutorials/types';

jest.mock('../../kibana_services', () => ({
  getServices: () => ({
    http: {
      post: jest.fn().mockImplementation(async () => ({ count: 1 })),
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
const bulkCreateMock = jest
  .fn<Promise<SavedObjectsBatchResponse<unknown>>, []>()
  .mockResolvedValue({
    savedObjects: [],
  });

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
            bulkCreate={bulkCreateMock}
          />
        </I18nProvider>
      );
      await loadTutorialPromise;

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
            bulkCreate={bulkCreateMock}
          />
        </I18nProvider>
      );
      await loadBasicTutorialPromise;

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
            bulkCreate={bulkCreateMock}
          />
        </I18nProvider>
      );
      await loadTutorialPromise;
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
            bulkCreate={bulkCreateMock}
          />
        </I18nProvider>
      );
      await loadTutorialPromise;

      expect(getByText('elasticCloud instructions')).toBeInTheDocument();
    });
  });
});
