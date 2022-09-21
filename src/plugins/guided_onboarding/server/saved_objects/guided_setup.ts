/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsType } from '@kbn/core/server';

import { guidesConfig } from '../../common/guides_config';
import type { UseCase } from '../../common/types';

export const guidedSetupSavedObjectsType = 'guided-setup-state';
export const guidedSetupSavedObjectsId = 'guided-setup-state-id';

const getDefaultStepsStatus = (guide: UseCase) => {
  const guideSteps = guidesConfig[guide].steps;

  return guideSteps.map((step) => {
    return {
      id: step.id,
      status: 'inactive',
    };
  });
};

export const guidedSetupDefaultState = {
  search: {
    stepsStatus: getDefaultStepsStatus('search'),
  },
  observability: {
    stepsStatus: getDefaultStepsStatus('observability'),
  },
  security: {
    stepsStatus: getDefaultStepsStatus('security'),
  },
};

export const guidedSetupSavedObjects: SavedObjectsType = {
  name: guidedSetupSavedObjectsType,
  hidden: false,
  // make it available in all spaces for now
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      search: {
        type: 'keyword',
        properties: {
          stepsStatus: {
            type: 'nested',
            properties: {
              id: {
                type: 'keyword',
              },
              status: {
                type: 'keyword',
              },
            },
          },
        },
      },
      observability: {
        type: 'keyword',
        properties: {
          stepsStatus: {
            type: 'nested',
            properties: {
              id: {
                type: 'keyword',
              },
              status: {
                type: 'keyword',
              },
            },
          },
        },
      },
      security: {
        type: 'keyword',
        properties: {
          stepsStatus: {
            type: 'nested',
            properties: {
              id: {
                type: 'keyword',
              },
              status: {
                type: 'keyword',
              },
            },
          },
        },
      },
    },
  },
};
