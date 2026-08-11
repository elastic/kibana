/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, Plugin, CoreStart } from '@kbn/core/server';
import type {
  AgentBuilderAddDocExamplePluginsSetup,
  AgentBuilderAddDocExamplePluginsStart,
} from './types';
import { createAddDocToIndexSkill } from './skills/add_doc_to_index';

export class AgentBuilderAddDocExamplePlugin
  implements
    Plugin<
      unknown,
      unknown,
      AgentBuilderAddDocExamplePluginsSetup,
      AgentBuilderAddDocExamplePluginsStart
    >
{
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<AgentBuilderAddDocExamplePluginsStart>,
    { agentBuilder }: AgentBuilderAddDocExamplePluginsSetup
  ) {
    // The platform owns the upload pipeline (upload route, uploaded_file
    // attachment type, filestore attachments volume, and readContent). This
    // example plugin is a server-only consumer that registers a single
    // skill whose inline tool reads the uploaded bytes via readContent and
    // bulk-indexes them into a custom ES index.
    agentBuilder.skills.register(createAddDocToIndexSkill());

    return {};
  }

  public start(_core: CoreStart, _plugins: AgentBuilderAddDocExamplePluginsStart) {
    return {};
  }

  public stop() {}
}
