#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Scout MCP Server CLI
 *
 * This is a simple CLI entry point for the Scout MCP Server.
 * It's designed to be run with tsx in the Kibana monorepo.
 *
 * Usage:
 *   npx tsx packages/kbn-scout-mcp/bin/cli.ts --target http://localhost:5601
 */

import { ToolingLog } from '@kbn/tooling-log';
import { ScoutMcpServer } from '../src/server';
import { loadScoutMcpConfig, validateConfig } from '../src/config';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  targetUrl?: string;
  mode?: 'stateful' | 'serverless';
  projectType?: 'es' | 'oblt' | 'security';
  configPath?: string;
  help?: boolean;
} {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--target' || arg === '-t') {
      parsed.targetUrl = args[++i];
    } else if (arg === '--mode' || arg === '-m') {
      parsed.mode = args[++i];
    } else if (arg === '--project-type' || arg === '-p') {
      parsed.projectType = args[++i];
    } else if (arg === '--config' || arg === '-c') {
      parsed.configPath = args[++i];
    }
  }

  return parsed;
}

/**
 * Show help message
 */
function showHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
Scout MCP Server - Model Context Protocol server for Scout test framework

USAGE:
  scout-mcp [options]

OPTIONS:
  -t, --target <url>           Target Kibana URL (default: http://localhost:5601)
  -m, --mode <mode>            Deployment mode: stateful or serverless (default: stateful)
  -p, --project-type <type>    Serverless project type: es, oblt, or security
  -c, --config <path>          Path to Scout config file
  -h, --help                   Show this help message

ENVIRONMENT VARIABLES:
  KIBANA_BASE_URL              Target Kibana URL
  SCOUT_MODE                   Deployment mode
  SCOUT_PROJECT_TYPE           Serverless project type
  SCOUT_CONFIG_PATH            Path to Scout config file

EXAMPLES:
  # Start with default local Kibana
  scout-mcp

  # Connect to remote Kibana
  scout-mcp --target https://my-kibana.example.com

  # Use serverless mode
  scout-mcp --mode serverless --project-type oblt --target https://my-project.es.cloud

  # Use environment variables
  KIBANA_BASE_URL=http://localhost:5601 scout-mcp

INTEGRATION:
  This MCP server exposes Scout test framework functionality through MCP tools.
  Use it with AI assistants that support the Model Context Protocol to:
  - Write Scout tests with guidance
  - Debug tests by inspecting page state
  - Execute test actions and verify behavior
  - Access Scout EUI components and browser automation tools

AVAILABLE TOOLS:
  Browser Automation:
    - scout_navigate, scout_click, scout_type
    - scout_snapshot, scout_screenshot, scout_wait_for

  Authentication:
    - scout_login, scout_logout, scout_get_auth_status

  EUI Components:
    - scout_eui_component, scout_list_eui_components

For more information, see the README.md file.
`);
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Create logger
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stderr, // Write logs to stderr to keep stdout clean for MCP
  });

  try {
    // Load configuration
    const config = loadScoutMcpConfig({
      targetUrl: args.targetUrl,
      mode: args.mode,
      projectType: args.projectType,
      configPath: args.configPath,
    });

    // Validate configuration
    if (!validateConfig(config, log)) {
      log.error('Invalid configuration');
      process.exit(1);
    }

    log.info('Scout MCP Server Configuration:');
    log.info(`  Target URL: ${config.targetUrl}`);
    log.info(`  Mode: ${config.mode}`);
    if (config.projectType) {
      log.info(`  Project Type: ${config.projectType}`);
    }

    // Create and start server
    const server = new ScoutMcpServer({
      ...config,
      log,
    });

    // Handle graceful shutdown
    const shutdown = async () => {
      log.info('Received shutdown signal');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start the server
    await server.start();

    // Keep the process running
    // The MCP server communicates via stdio, so it will run until interrupted
  } catch (error) {
    log.error('Failed to start Scout MCP Server');
    log.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      log.debug(error.stack);
    }

    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
