/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// There is an (incomplete) `AgentConfigOptions` type declared in node_modules/elastic-apm-node/index.d.ts
// but it's not exported, and using ts tricks to retrieve the type via Parameters<ApmAgent['start']>[0]
// causes errors in the generated .d.ts file because of esModuleInterop and the fact that the apm module
// is just exporting an instance of the `ApmAgent` type.
export type ApmAgentConfig = Record<string, any>;
