/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreTasksSetup, TasksPlugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerAttachments } from '../agent_builder/register_attachments';
import { registerTools } from '../agent_builder/register_tools';
import { registerSkill } from '../agent_builder/register_skill';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
}

/** The agent builder side of Discover for a task pod: its attachments, tool and skills. */
class DiscoverTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  setup(_core: CoreTasksSetup, { agentBuilder }: TasksSetupDeps) {
    registerAttachments(agentBuilder);
    registerTools(agentBuilder);
    registerSkill(agentBuilder);
  }

  start() {}
}

export const plugin = async () => new DiscoverTasksPlugin();
