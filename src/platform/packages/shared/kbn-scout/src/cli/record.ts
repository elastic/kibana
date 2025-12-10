/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import path, { resolve } from 'path';
import { createInterface } from 'readline';
import type { Command, FlagsReader, FlagOptions } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import { withProcRunner } from '@kbn/dev-proc-runner';
import { initLogsDir } from '@kbn/test';
import { parseServerFlags, SERVER_FLAG_OPTIONS } from '../servers';
import { runElasticsearch } from '../servers/run_elasticsearch';
import { runKibanaServer, getExtraKbnOpts } from '../servers/run_kibana_server';
import { loadServersConfig } from '../config';
import { silence } from '../common';
import { createSamlSessionManager } from '../common/services/saml_auth';
import { ScoutLogger } from '../common/services/logger';
import type { RecorderOptions } from './record/types';
import { transformPlaywrightCode } from './record/transformer';
import { buildSelectorMappings } from './record/selector_detector';
import { postProcessCode } from './record/post_processor';
import { ensurePlaywrightConfig, detectScoutPackage } from './record/create_config';
import { getAppRouteFromPlugin, getPluginPath } from './record/get_plugin_app_path';

const RECORDER_FLAG_OPTIONS: FlagOptions = {
  ...SERVER_FLAG_OPTIONS,
  string: [...(SERVER_FLAG_OPTIONS.string || []), 'plugin', 'output', 'role', 'url'],
  boolean: [...(SERVER_FLAG_OPTIONS.boolean || []), 'parallel'],
  default: { output: 'recorded_test.spec.ts', role: 'admin', parallel: false },
  help: `${SERVER_FLAG_OPTIONS.help}
    --plugin             Plugin name as defined in package.json, without the @kbn scope (e.g. maps-plugin, apm-plugin, etc.) - Required
    --role               Pre-authenticate as role before recording (default: admin)
    --url                Starting URL path to navigate to when recorder starts (e.g., /app/maps). We will attempt to get it from the Plugin.ts file if not provided. - Optional
    --testDirectory      Test directory to save the test file to (default: test/scout/ui)
    --output             Output test file name with extension (default: recorded_test.spec.ts)
    --role               Pre-authenticate as role before recording (default: admin)
    --parallel           Generate test using spaceTest for parallel execution (default: false)
  `,
};

export const recordCmd: Command<void> = {
  name: 'record',
  description: `
  Generate Scout tests using Playwright's test recorder.

  This command:
  1. Starts Kibana and Elasticsearch
  2. Opens Playwright's test generator (codegen)
  3. Writes the recorded test to a file
  4. Saves the test file to your plugin's test directory

  Example usage:
    node scripts/scout.js record --stateful --plugin maps-plugin --role admin                            <-- will start with Maps app, logged in as admin
    node scripts/scout.js record --stateful --plugin maps-plugin                                         <-- will start with login page
    node scripts/scout.js record --serverless=oblt --plugin apm-plugin --url /app/apm/some-other-path    <-- will start with defined URL, logged in as admin
    node scripts/scout.js record --stateful --plugin my-plugin --parallel --role editor                  <-- will start with login page, logged in as editor
  `,
  flags: RECORDER_FLAG_OPTIONS,
  run: async ({ flagsReader, log }) => {
    const options = await parseCodegenFlags(flagsReader);
    await runRecorder(log, options);
  },
};

async function parseCodegenFlags(
  flags: FlagsReader
): Promise<RecorderOptions & { startUrl?: string }> {
  const serverOptions = parseServerFlags(flags);

  const plugin = flags.string('plugin');

  if (!plugin) {
    throw createFlagError('--plugin flag is required');
  }

  const pluginPath = await getPluginPath(plugin);

  if (!pluginPath) {
    throw createFlagError(`Plugin name not found in dependencies: ${plugin}`);
  }

  const fullPluginPath = path.join(REPO_ROOT, pluginPath);

  if (!existsSync(fullPluginPath)) {
    throw createFlagError(`Plugin path ${fullPluginPath}does not exist for plugin ${plugin}`);
  }

  const pluginAppPath = `${fullPluginPath}/public/plugin.ts`;

  // Get appRoute from pluginAppPath.
  const pluginAppRoute = await getAppRouteFromPlugin(pluginAppPath);

  const outputFileName = flags.string('output') || 'recorded_test.spec.ts';
  const testDirectory = flags.string('testDirectory') || 'test/scout/ui';
  const role = flags.string('role') || 'admin';
  const parallel = flags.boolean('parallel') || false;
  const startUrl = flags.string('url') || pluginAppRoute;

  return {
    ...serverOptions,
    outputFileName,
    parallel,
    pluginPath,
    role,
    startUrl,
    testDirectory,
  };
}

async function runRecorder(log: ToolingLog, options: RecorderOptions) {
  const kibanaBaseUrl = 'http://localhost:5620';

  const {
    logsDir,
    esFrom,
    installDir,
    outputFileName,
    parallel,
    pluginPath,
    mode,
    role,
    startUrl,
    testDirectory,
  } = options;

  log.info('Starting Scout Recorder...');
  log.info(`Plugin: ${pluginPath}`);
  log.info(`Start URL: ${startUrl}`);
  log.info(`Role: ${role}`);
  log.info(`Test directory: ${testDirectory}`);
  log.info(`Parallel: ${parallel}`);
  log.info('');

  if (logsDir) {
    await initLogsDir(log, logsDir);
  }

  await withProcRunner(log, async (procs) => {
    const config = await loadServersConfig(mode, log);
    const abortCtrl = new AbortController();

    const onEarlyExit = (msg: string) => {
      log.error(msg);
      abortCtrl.abort();
    };

    let shutdownEs;
    let storageStatePath: string | undefined;

    try {
      // Start Elasticsearch
      log.info('Starting Elasticsearch...');

      shutdownEs = await runElasticsearch({
        onEarlyExit,
        config,
        log,
        esFrom,
        logsDir,
      });

      // Start Kibana
      log.info('Starting Kibana...');

      await runKibanaServer({
        procs,
        onEarlyExit,
        config,
        installDir,
        extraKbnOpts: getExtraKbnOpts(installDir, config.get('serverless')),
      });

      // Wait for servers to be ready
      log.info('Waiting for servers to be ready...');

      await silence(log, 5000);

      log.info('');
      log.info('========================================');
      log.info('Kibana and Elasticsearch are ready!');
      log.info('========================================');
      log.info('');
      log.info('1. A browser window will now open for test recording.');
      log.info('2. Perform your test actions in the browser.');
      log.info('3. The test recorder will capture your actions.');
      log.info('4. When done, close the Playwright Inspector window.');
      log.info('5. You will be prompted to record another test or exit.');
      log.info('');

      // Determine Scout package and deployment tags (used for all sessions)
      const scoutPackage = detectScoutPackage(pluginPath);
      const deploymentTags = mode.startsWith('serverless') ? ["'@svlOblt'"] : ["'@ess'"];
      const playwrightBin = resolve(REPO_ROOT, './node_modules/.bin/playwright');

      // Create authenticated storage state for pre-authenticated recording
      log.info('');
      try {
        const scoutTestConfig = config.getScoutTestConfig();
        storageStatePath = await createAuthenticatedStorageState(
          log,
          scoutTestConfig,
          role,
          kibanaBaseUrl
        );
      } catch (error) {
        log.error('Failed to create authenticated session:');
        log.error(error);
        log.warning('Recorder will start unauthenticated - you will need to log in manually.');
      }
      log.info('');

      // Main recording loop
      let continueRecording = true;

      let testCount = 0;

      const recordedTests: string[] = [];

      // Ensure the output directory exists (once, before the loop)
      const testsOutputDir = path.join(REPO_ROOT, pluginPath, testDirectory);
      await fs.mkdir(testsOutputDir, { recursive: true });

      while (continueRecording) {
        testCount++;

        // Use a temporary filename during recording.
        // We will move it to the final location after the user has named it.
        const tempFilename = `temp_recording_${Date.now()}.spec.ts`;
        const tempTestPath = path.join(REPO_ROOT, pluginPath, testDirectory, tempFilename);

        log.info(`\nRecording session #${testCount}`);

        // Build URL for this session
        const sessionKibanaUrl = `${kibanaBaseUrl}${
          startUrl?.startsWith('/') ? '' : '/'
        }${startUrl}`;

        if (sessionKibanaUrl) {
          log.info(`Starting URL: ${sessionKibanaUrl}`);
        }

        // Run the codegen session with temp file
        await runSingleRecorder({
          deploymentTags,
          fullTestPath: tempTestPath,
          kibanaUrl: sessionKibanaUrl,
          log,
          parallel,
          playwrightBin,
          pluginPath,
          role,
          scoutPackage,
          storageStatePath,
        });

        // Now ask the user what to name this test
        log.info('');
        log.info('========================================');

        const defaultFilename = testCount === 1 ? outputFileName : `test_${testCount}.spec.ts`;
        const finalFilename = await promptUser(`Name test file (default: ${defaultFilename}): `);
        const actualFilename = finalFilename.trim() || defaultFilename;

        // Ask for test description
        const testDescription = await promptUser(`Test description (default: 'test'): `);
        const actualTestDescription = testDescription.trim() || 'test';

        // Ensure .spec.ts extension
        const normalizedFilename = actualFilename.endsWith('.spec.ts')
          ? actualFilename
          : `${actualFilename}.spec.ts`;

        // Keep track of what files were created for the summary
        recordedTests.push(normalizedFilename);

        // Move from temp to final location
        const finalTestPath = path.join(
          REPO_ROOT,
          pluginPath,
          testDirectory,
          'tests',
          normalizedFilename
        );

        await fs.rename(tempTestPath, finalTestPath);

        // Replace the generic test name with the user's description
        let testContent = await fs.readFile(finalTestPath, 'utf-8');

        testContent = testContent.replace(/test\('test',/g, `test('${actualTestDescription}',`);

        await fs.writeFile(finalTestPath, testContent, 'utf-8');

        log.success(`✅ Test saved as ${pluginPath}/${testDirectory}/tests/${normalizedFilename}.`);
        log.info('');
        log.info('Next steps:');
        log.info('1. Review and refine the generated test in your IDE');
        log.info('2. Add test descriptions and assertions');
        log.info('3. Replace generic selectors with page objects where possible');
        log.info('4. Run the test to verify it works:');
        log.info(
          `   node scripts/scout.js run-tests --${
            mode.includes('serverless') ? `serverless=${mode.split('=')[1]}` : 'stateful'
          } --testFiles ${pluginPath}/${testDirectory}/tests/${normalizedFilename}`
        );
        log.info('');
        log.info('');
        log.info('========================================');

        const answer = await promptUser('Record another? (y/n) (default: yes): ');

        if (
          answer.trim() === '' ||
          answer.trim().toLowerCase() === 'y' ||
          answer.trim().toLowerCase() === 'yes'
        ) {
          log.info('');
          log.info('Starting new recording session...');
        } else {
          continueRecording = false;
          log.info('');

          log.info('Exiting recorder...');
        }
      }

      // Summarize the tests that were recorded
      log.info('');
      log.info(`✅ Recorded ${testCount} test${testCount > 1 ? 's' : ''} successfully!`);
      recordedTests.forEach((test) => {
        log.info(`  - ${pluginPath}/${testDirectory}/tests/${test}`);
      });
      log.info('');
    } finally {
      // Clean up storage state file
      if (storageStatePath && existsSync(storageStatePath)) {
        try {
          await fs.unlink(storageStatePath);
          log.debug('Cleaned up authentication storage state');
        } catch (error) {
          log.debug(`Failed to cleanup storage state: ${error}`);
        }
      }

      // Clean up servers
      log.info('Shutting down servers...');
      try {
        await procs.stop('kibana');
      } finally {
        if (shutdownEs) {
          await shutdownEs();
        }
      }
    }
  });
}

/**
 * Runs a single recorder session
 */
async function runSingleRecorder({
  deploymentTags,
  fullTestPath,
  kibanaUrl,
  log,
  parallel,
  playwrightBin,
  pluginPath,
  role,
  scoutPackage,
  storageStatePath,
}: {
  deploymentTags: string[];
  fullTestPath: string;
  kibanaUrl: string;
  log: ToolingLog;
  parallel: boolean;
  playwrightBin: string;
  pluginPath: string;
  role: string;
  scoutPackage: string;
  storageStatePath?: string;
}): Promise<boolean> {
  log.info('');
  log.info('========================================');
  log.info('Launching Scout Recorder...');
  log.info('========================================');
  log.info(`Output file: ${fullTestPath}`);
  log.info(`Starting URL: ${kibanaUrl}`);
  if (storageStatePath) {
    log.info(`Pre-authenticated as: ${role}`);
  }
  log.info('');

  await new Promise<void>((resolveRecorder, rejectRecoder) => {
    const codegenArgs = [
      'codegen',
      kibanaUrl,
      '--target',
      'playwright-test',
      '--output',
      fullTestPath,
      '--test-id-attribute',
      'data-test-subj',
    ];

    // Add storage state if provided
    if (storageStatePath) {
      codegenArgs.push('--load-storage', storageStatePath);
    }

    const recorderProcess = spawn(playwrightBin, codegenArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: REPO_ROOT,
    });

    // Capture stderr for any error messages
    let stderrOutput = '';

    recorderProcess.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
      log.debug(`Playwright: ${data.toString().trim()}`);
    });

    recorderProcess.on('spawn', () => {
      log.success('Scout Recorder started successfully!');
      log.info('Browser and Inspector windows should now be open.');
      log.info('Record your test actions, then close the Playwright Inspector window.');
    });

    recorderProcess.on('close', (code) => {
      log.debug(`Playwright codegen closed with code: ${code}`);

      if (code === 0 || code === null) {
        log.info('Scout Recorder closed.');
        resolveRecorder();
      } else {
        rejectRecoder(
          new Error(
            `Scout Recorder exited with code ${code}${
              stderrOutput ? `\nError output: ${stderrOutput}` : ''
            }`
          )
        );
      }
    });

    recorderProcess.on('error', (err) => {
      log.error('Failed to start Scout Recorder:');
      log.error(err.message);
      rejectRecoder(err);
    });
  });

  log.info('Reading generated code from file...');

  const generatedCode = await fs.readFile(fullTestPath, 'utf-8');

  // Detect selectors
  const selectorMappings = buildSelectorMappings(generatedCode);

  // Transform the code
  const transformResult = transformPlaywrightCode(
    generatedCode,
    {
      deploymentTags,
      role,
      scoutPackage,
      useSpaceTest: parallel,
    },
    selectorMappings
  );

  const finalCode = await postProcessCode(transformResult, fullTestPath, scoutPackage);

  // Ensure config exists
  await ensurePlaywrightConfig(pluginPath, parallel);

  await fs.writeFile(fullTestPath, finalCode, 'utf-8');

  log.success('');
  log.success('========================================');
  log.success('Test file generated successfully!');
  log.success('========================================');
  log.success('');
  log.success(`Location: ${fullTestPath}`);
  log.success('');

  if (transformResult.warnings.length > 0) {
    log.warning('Please review these warnings:');
    transformResult.warnings.forEach((warning) => {
      log.warning(`  - ${warning}`);
    });
    log.warning('');
  }

  return true;
}

/**
 * Prompts the user for input
 */
async function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolvePromise) => {
    rl.question(question, (answer) => {
      rl.close();
      resolvePromise(answer.trim());
    });
  });
}

/**
 * Creates a Playwright storage state file with an authenticated SAML session
 */
async function createAuthenticatedStorageState(
  log: ToolingLog,
  scoutTestConfig: any,
  role: string,
  kibanaUrl: string
): Promise<string> {
  log.info(`Creating authenticated session for role: ${role}`);

  // Create logger for SAML auth
  const scoutLogger = new ScoutLogger('codegen');

  // Create SAML session manager
  const samlAuth = createSamlSessionManager(scoutTestConfig, scoutLogger);

  // Get session cookie for the specified role
  const sessionCookie = await samlAuth.getInteractiveUserSessionCookieWithRoleScope(role);

  // Parse Kibana URL to get domain
  const url = new URL(kibanaUrl);

  // Create Playwright storage state format
  const storageState = {
    cookies: [
      {
        name: 'sid',
        value: sessionCookie,
        domain: url.hostname,
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };

  // Save to temp file
  const storageStatePath = path.join(REPO_ROOT, '.scout', 'codegen_auth_state.json');
  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
  await fs.writeFile(storageStatePath, JSON.stringify(storageState, null, 2));

  log.success(`✓ Authenticated session created for role: ${role}`);

  return storageStatePath;
}
