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

import { ToolingLog } from '@kbn/dev-utils';
import {
  Extractor,
  IConfigFile,
  ExtractorLogLevel,
  ExtractorConfig,
  ExtractorResult,
  ExtractorMessage,
} from '@microsoft/api-extractor';
import chalk from 'chalk';
import dedent from 'dedent';
import execa from 'execa';
import fs from 'fs';
import path from 'path';
import getopts from 'getopts';

const apiExtractorConfig = (folder: string): ExtractorConfig => {
  const config: IConfigFile = {
    newlineKind: 'lf',
    compiler: {
      tsconfigFilePath: '<projectFolder>/tsconfig.json',
    },
    projectFolder: path.resolve('./'),
    mainEntryPointFilePath: `target/types/core/${folder}/index.d.ts`,
    apiReport: {
      enabled: true,
      reportFileName: `${folder}.api.md`,
      reportFolder: `<projectFolder>/src/core/${folder}/`,
      reportTempFolder: `<projectFolder>/build/${folder}/`,
    },
    docModel: {
      enabled: true,
      apiJsonFilePath: `./build/${folder}/${folder}.api.json`,
    },
    tsdocMetadata: {
      enabled: false,
    },
    messages: {
      extractorMessageReporting: {
        default: {
          logLevel: 'warning' as ExtractorLogLevel.Warning,
          addToApiReportFile: true,
        },
        'ae-internal-missing-underscore': {
          logLevel: 'none' as ExtractorLogLevel.None,
          addToApiReportFile: false,
        },
      },
    },
  };
  const con = ExtractorConfig.prepare({
    configObject: config,
    configObjectFullPath: undefined,
    packageJsonFullPath: path.resolve('package.json'),
  });

  return con;
};

const runBuildTypes = async () => {
  await execa('yarn', ['run', 'build:types']);
};

const runApiDocumenter = async (folder: string) => {
  await execa(
    'api-documenter',
    ['markdown', '-i', `./build/${folder}`, '-o', `./docs/development/core/${folder}`],
    {
      preferLocal: true,
    }
  );
};

const renameExtractedApiPackageName = async (folder: string) => {
  const json = JSON.parse(fs.readFileSync(`build/${folder}/${folder}.api.json`).toString());
  json.canonicalReference = `kibana-plugin-${folder}`;
  json.name = `kibana-plugin-${folder}`;
  fs.writeFileSync(`build/${folder}/${folder}.api.json`, JSON.stringify(json, null, 2));
};

/**
 * Runs api-extractor with a custom logger in order to extract results from the process
 *
 */
const runApiExtractor = (
  log: ToolingLog,
  folder: string,
  acceptChanges: boolean = false
): ExtractorResult => {
  const config = apiExtractorConfig(folder);
  const options = {
    // Indicates that API Extractor is running as part of a local build,
    // e.g. on developer's machine. For example, if the *.api.md output file
    // has differences, it will be automatically overwritten for a
    // local build, whereas this should report an error for a production build.
    localBuild: acceptChanges,
    messageCallback: (message: ExtractorMessage) => {
      if (message.messageId === 'console-api-report-not-copied') {
        // ConsoleMessageId.ApiReportNotCopied
        log.warning(`You have changed the signature of the ${folder} Core API`);
        log.warning(
          'To accept these changes run `node scripts/check_core_api_changes.js --accept` and then:\n' +
            "\t 1. Commit the updated documentation and API review file '" +
            config.reportFilePath +
            "' \n" +
            "\t 2. Describe the change in your PR including whether it's a major, minor or patch"
        );
        message.handled = true;
      } else if (message.messageId === 'console-api-report-copied') {
        // ConsoleMessageId.ApiReportCopied
        log.warning(`You have changed the signature of the ${folder} Core API`);
        log.warning(
          "Please commit the updated API documentation and the API review file: '" +
            config.reportFilePath
        );
        message.handled = true;
      } else if (message.messageId === 'console-api-report-unchanged') {
        // ConsoleMessageId.ApiReportUnchanged
        log.info(`Core ${folder} API: no changes detected ✔`);
        message.handled = true;
      }
    },
  };

  return Extractor.invoke(config, options);
};

async function run(folder: string): Promise<boolean> {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  const extraFlags: string[] = [];
  const opts = getopts(process.argv.slice(2), {
    boolean: ['accept', 'docs', 'help'],
    default: {
      project: undefined,
    },
    unknown(name) {
      extraFlags.push(name);
      return false;
    },
  });

  if (extraFlags.length > 0) {
    for (const flag of extraFlags) {
      log.error(`Unknown flag: ${flag}`);
    }

    opts.help = true;
  }

  if (opts.help) {
    process.stdout.write(
      dedent(chalk`
        {dim usage:} node scripts/check_core_api_changes [...options]

        Checks for any changes to the Kibana Core API

        Examples:

          {dim # Checks for any changes to the Kibana Core API}
          {dim $} node scripts/check_core_api_changes

          {dim # Checks for any changes to the Kibana Core API and updates the documentation}
          {dim $} node scripts/check_core_api_changes --docs

          {dim # Checks for and automatically accepts and updates documentation for any changes to the Kibana Core API}
          {dim $} node scripts/check_core_api_changes --accept

        Options:
          --accept    {dim Accepts all changes by updating the API Review files and documentation}
          --docs      {dim Updates the Core API documentation}
          --help      {dim Show this message}
      `)
    );
    process.stdout.write('\n');
    return !(extraFlags.length > 0);
  }

  log.info(`Core ${folder} API: checking for changes in API signature...`);

  try {
    await runBuildTypes();
  } catch (e) {
    log.error(e);
    return false;
  }

  const { apiReportChanged, succeeded } = runApiExtractor(log, folder, opts.accept);

  // If we're not accepting changes and there's a failure, exit.
  if (!opts.accept && !succeeded) {
    return false;
  }

  // Attempt to generate docs even if api-extractor didn't succeed
  if ((opts.accept && apiReportChanged) || opts.docs) {
    try {
      await renameExtractedApiPackageName(folder);
      await runApiDocumenter(folder);
    } catch (e) {
      log.error(e);
      return false;
    }
    log.info(`Core ${folder} API: updated documentation ✔`);
  }

  // If the api signature changed or any errors or warnings occured, exit with an error
  // NOTE: Because of https://github.com/Microsoft/web-build-tools/issues/1258
  //  api-extractor will not return `succeeded: false` when the API changes.
  return !apiReportChanged && succeeded;
}

(async () => {
  const publicSucceeded = await run('public');
  const serverSucceeded = await run('server');

  if (!publicSucceeded || !serverSucceeded) {
    process.exitCode = 1;
  }
})();
