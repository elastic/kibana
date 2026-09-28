/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chatAgentTypeId } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { ACTIVITY_INVESTIGATION_AGENT_ID } from '../../common/agent_builder';

const INSTRUCTIONS = [
  'Investigate only the frozen Discover activity investigation attachments in this conversation.',
  'Follow each attachment description and use its bounded investigation tool for source-data analysis.',
  'Do not request additional skills or use tools that are not explicitly supplied by the attachment.',
  'Keep separate attachments and their findings distinct.',
].join('\n');

/** Registers the restricted agent used by the Discover activity investigation entry point. */
export const registerActivityInvestigationAgent = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.register({
    type: chatAgentTypeId,
    id: ACTIVITY_INVESTIGATION_AGENT_ID,
    name: 'Discover activity investigation',
    description: 'Investigates a frozen activity increase detected in Discover.',
    avatar_icon: 'discoverApp',
    configuration: {
      instructions: INSTRUCTIONS,
      tools: [],
      skill_ids: [],
      enable_elastic_capabilities: false,
      connector_ids: [],
      ai_indices: [],
    },
  });
};
