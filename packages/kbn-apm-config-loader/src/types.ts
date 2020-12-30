/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// There is an (incomplete) `AgentConfigOptions` type declared in node_modules/elastic-apm-node/index.d.ts
// but it's not exported, and using ts tricks to retrieve the type via Parameters<ApmAgent['start']>[0]
// causes errors in the generated .d.ts file because of esModuleInterop and the fact that the apm module
// is just exporting an instance of the `ApmAgent` type.
export type ApmAgentConfig = Record<string, any>;
