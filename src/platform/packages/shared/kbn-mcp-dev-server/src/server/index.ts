/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { run } from '@kbn/dev-cli-runner';

import { addTool } from '../utils';
import { listKibanaPackagesTool } from '../tools/list_packages';
import { generateKibanaPackageTool } from '../tools/generate_package';
import { listKibanaTeamsTool } from '../tools/list_teams';
import { runUnitTestsTool } from '../tools/run_unit_tests';
import { runCiChecksTool } from '../tools/run_ci_checks';
import { searchByCodeownerTool } from '../tools/search_by_codeowner';
import { findDependencyReferencesTool } from '../tools/find_dependency_references';

run(async () => {
  const server = new McpServer({ name: 'mcp-dev-server', version: '1.0.0' });

  addTool(server, listKibanaPackagesTool);
  addTool(server, generateKibanaPackageTool);
  addTool(server, listKibanaTeamsTool);
  addTool(server, runUnitTestsTool);
  addTool(server, runCiChecksTool);
  addTool(server, searchByCodeownerTool);
  addTool(server, findDependencyReferencesTool);

  const transport = new StdioServerTransport();
  await server.connect(transport);
});
