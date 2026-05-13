/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/public';
import type {
  ReportWorkflowAiChatOpenedParams,
  ReportWorkflowAiProposalReceivedParams,
  ReportWorkflowAiProposalResolvedParams,
  ReportWorkflowAiSessionCompletedParams,
} from './types';
import { WorkflowAiChatEventTypes } from './types';

export const workflowAiChatEventNames = {
  [WorkflowAiChatEventTypes.WorkflowAiChatOpened]: 'Workflow AI chat opened',
  [WorkflowAiChatEventTypes.WorkflowAiProposalReceived]: 'Workflow AI proposal received',
  [WorkflowAiChatEventTypes.WorkflowAiProposalResolved]: 'Workflow AI proposal resolved',
  [WorkflowAiChatEventTypes.WorkflowAiSessionCompleted]: 'Workflow AI session completed',
};

const eventNameSchema: RootSchema<{ eventName: string }> = {
  eventName: {
    type: 'keyword',
    _meta: {
      description: 'The event name/description',
      optional: false,
    },
  },
};

const workflowAiChatOpenedSchema: RootSchema<ReportWorkflowAiChatOpenedParams> = {
  ...eventNameSchema,
  entryPoint: {
    type: 'keyword',
    _meta: {
      description:
        'How the AI chat was opened: workflow_editor (via the AI Agent button) or header_on_editor_page (via the Kibana header while on the workflow editor page)',
      optional: false,
    },
  },
  sessionType: {
    type: 'keyword',
    _meta: {
      description:
        'Whether this is an edit session (existing workflow) or create session (new workflow)',
      optional: false,
    },
  },
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID if editing an existing workflow',
      optional: true,
    },
  },
};

const workflowAiProposalReceivedSchema: RootSchema<ReportWorkflowAiProposalReceivedParams> = {
  ...eventNameSchema,
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID if editing an existing workflow',
      optional: true,
    },
  },
  conversationId: {
    type: 'keyword',
    _meta: {
      description:
        'The agent builder conversation ID, for joining with agent_builder_round_complete events',
      optional: true,
    },
  },
  proposalId: {
    type: 'keyword',
    _meta: {
      description: 'The unique ID of the proposal shown to the user',
      optional: false,
    },
  },
  toolId: {
    type: 'keyword',
    _meta: {
      description: 'The edit tool that produced this proposal',
      optional: false,
    },
  },
  sessionType: {
    type: 'keyword',
    _meta: {
      description:
        'Whether this is an edit session (existing workflow) or create session (new workflow)',
      optional: false,
    },
  },
};

const workflowAiProposalResolvedSchema: RootSchema<ReportWorkflowAiProposalResolvedParams> = {
  ...eventNameSchema,
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID if editing an existing workflow',
      optional: true,
    },
  },
  conversationId: {
    type: 'keyword',
    _meta: {
      description:
        'The agent builder conversation ID, for joining with agent_builder_round_complete events',
      optional: true,
    },
  },
  proposalId: {
    type: 'keyword',
    _meta: {
      description: 'The unique ID of the proposal being resolved',
      optional: false,
    },
  },
  resolution: {
    type: 'keyword',
    _meta: {
      description: 'Whether the proposal was accepted or rejected',
      optional: false,
    },
  },
  toolId: {
    type: 'keyword',
    _meta: {
      description:
        'The edit tool that produced this proposal (e.g. workflow_insert_step, workflow_modify_step)',
      optional: false,
    },
  },
  isBulkAction: {
    type: 'boolean',
    _meta: {
      description: 'Whether this resolution was part of an accept-all or reject-all action',
      optional: false,
    },
  },
};

const workflowAiSessionCompletedSchema: RootSchema<ReportWorkflowAiSessionCompletedParams> = {
  ...eventNameSchema,
  sessionType: {
    type: 'keyword',
    _meta: {
      description:
        'Whether this was an edit session (existing workflow) or create session (new workflow)',
      optional: false,
    },
  },
  workflowId: {
    type: 'keyword',
    _meta: {
      description: 'The workflow ID if editing an existing workflow',
      optional: true,
    },
  },
  conversationId: {
    type: 'keyword',
    _meta: {
      description:
        'The agent builder conversation ID, for joining with agent_builder_round_complete events',
      optional: true,
    },
  },
  proposalsAccepted: {
    type: 'integer',
    _meta: {
      description: 'Number of AI proposals that were accepted by the user',
      optional: false,
    },
  },
  proposalsDeclined: {
    type: 'integer',
    _meta: {
      description: 'Number of AI proposals that were declined by the user',
      optional: false,
    },
  },
  proposalsPending: {
    type: 'integer',
    _meta: {
      description: 'Number of AI proposals still pending when the session ended',
      optional: false,
    },
  },
};

export const workflowAiChatEventSchemas = {
  [WorkflowAiChatEventTypes.WorkflowAiChatOpened]: workflowAiChatOpenedSchema,
  [WorkflowAiChatEventTypes.WorkflowAiProposalReceived]: workflowAiProposalReceivedSchema,
  [WorkflowAiChatEventTypes.WorkflowAiProposalResolved]: workflowAiProposalResolvedSchema,
  [WorkflowAiChatEventTypes.WorkflowAiSessionCompleted]: workflowAiSessionCompletedSchema,
};
