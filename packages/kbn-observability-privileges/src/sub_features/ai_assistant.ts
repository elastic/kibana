/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import {
//   CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
//   ACTION_SAVED_OBJECT_TYPE,
//   ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
// } from '@kbn/actions-plugin/server/constants/saved_objects';

// server side actions plugin constants cannot be imported in the common package. Need to move the constants to a common package.
export const ACTION_SAVED_OBJECT_TYPE = 'action';
export const ALERT_SAVED_OBJECT_TYPE = 'alert';
export const ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE = 'action_task_params';
export const CONNECTOR_TOKEN_SAVED_OBJECT_TYPE = 'connector_token';

export const AI_ASSISTANT_APP_ID = 'observabilityAIAssistant';

export const AI_ASSISTANT_SUB_FEATURE = {
  groupType: 'independent',
  privileges: [
    {
      id: 'ai_assistant_all',
      name: 'All',
      includeIn: 'all',
      app: [AI_ASSISTANT_APP_ID],
      api: [AI_ASSISTANT_APP_ID, 'ai_assistant'],
      catalogue: [AI_ASSISTANT_APP_ID],
      minimumLicense: 'enterprise',
      savedObject: {
        all: [
          ACTION_SAVED_OBJECT_TYPE,
          ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        ],
        read: [],
      },
      ui: ['ai_assistant:show'],
    },
  ],
};
