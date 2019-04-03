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
import { Extractor, IExtractorConfig } from '@microsoft/api-extractor';
import chalk from 'chalk';
import dedent from 'dedent';
import execa from 'execa';
import fs from 'fs';
import getopts from 'getopts';

const apiExtractorConfig = (folder: string): IExtractorConfig => {
  return {
    compiler: {
      configType: 'tsconfig',
      rootFolder: '.',
    },
    project: {
      entryPointSourceFile: `target/types/${folder}/index.d.ts`,
    },
    apiReviewFile: {
      enabled: true,
      apiReviewFolder: `./src/core/${folder}/`,
      tempFolder: `./build/${folder}/`,
    },
    apiJsonFile: {
      enabled: true,
      outputFolder: `./build/${folder}`,
    },
    dtsRollup: {
      enabled: false,
      trimming: true,
      publishFolderForInternal: '',
      publishFolderForBeta: '',
      publishFolderForPublic: '',
      mainDtsRollupPath: '',
    },
    policies: {
      namespaceSupport: 'permissive',
    },
  };
};

const runBuildTypes = async () => {
  await execa.shell('yarn run build:types');
};

const runApiDocumenter = async (folder: string) => {
  await execa.shell(
    `api-documenter markdown -i ./build/${folder} -o ./docs/development/core/${folder}`
  );
};

const isApiChangedWarning = (warning: string) => {
  return warning.startsWith('You have changed the public API signature for this project.');
};

const renameExtractedApiPackageName = async (folder: string) => {
  const json = JSON.parse(fs.readFileSync(`build/${folder}/kibana.api.json`).toString());
  json.canonicalReference = `kibana-plugin-${folder}`;
  json.name = `kibana-plugin-${folder}`;
  fs.writeFileSync(`build/${folder}/kibana.api.json`, JSON.stringify(json, null, 2));
};

/**
 * Runs api-extractor with a custom logger in order to extract results from the process
 *
 * TODO: Once Microsoft/web-build-tools#1133 is fixed, use the updated interface instead
 *  of parsing log strings.
 */
const runApiExtractor = (folder: string, acceptChanges: boolean = false) => {
  // Because of the internals of api-extractor ILogger can't be implemented as a typescript Class
  const warnings = [] as string[];
  const errors = [] as string[];

  const memoryLogger = {
    logVerbose(message: string) {
      return null;
    },

    logInfo(message: string) {
      return null;
    },

    logWarning(message: string) {
      warnings.push(message);
    },

    logError(message: string) {
      errors.push(message);
    },
  };

  const options = {
    // Indicates that API Extractor is running as part of a local build,
    // e.g. on developer's machine. For example, if the *.api.ts output file
    // has differences, it will be automatically overwritten for a
    // local build, whereas this should report an error for a production build.
    localBuild: acceptChanges,
    customLogger: memoryLogger,
  };

  const extractor = new Extractor(apiExtractorConfig(folder), options);
  extractor.processProject();

  const printableWarnings = warnings.filter(msg => !isApiChangedWarning(msg));
  const apiChanged = warnings.some(isApiChangedWarning);

  return { apiChanged, warnings: printableWarnings, errors };
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

  const { apiChanged, warnings, errors } = runApiExtractor(folder, opts.accept);
  await renameExtractedApiPackageName(folder);

  const apiReviewFilePath =
    apiExtractorConfig(folder)!.apiReviewFile!.apiReviewFolder + 'kibana.api.md';

  if (apiChanged && opts.accept) {
    log.warning(`You have changed the public signature of the ${folder} Core API`);
    log.warning(
      `Please commit the updated API documentation and the review file in '${apiReviewFilePath}' \n`
    );
  }

  if (apiChanged && !opts.accept) {
    log.warning('You have changed the public signature of the Kibana Core API');
    log.warning(
      'To accept these changes run `node scripts/check_core_api_changes.js --accept` and then:\n' +
        `\t 1. Commit the updated documentation and API review file ${apiReviewFilePath}' \n` +
        "\t 2. Describe the change in your PR including whether it's a major, minor or patch"
    );
  }

  if (!apiChanged) {
    log.info(`Core ${folder} API: no changes detected ✔`);
  }

  if (opts.accept || opts.docs) {
    await runApiDocumenter(folder)
      .then(() => {
        log.info(`Core ${folder} API: updated documentation ✔`);
      })
      .catch(e => {
        log.error(e);
        return false;
      });
  }

  // If the API changed and we're not accepting the changes, exit process with error
  if (apiChanged && !opts.accept) {
    return false;
  }

  // If any errors or warnings occured, exit with an error
  if (errors.length > 0 || warnings.length > 0) {
    log.error(`Core ${folder} API: api-extractor failed with the following errors or warnings:`);
    errors.forEach(msg => log.error(msg));
    warnings.forEach(msg => log.warning(msg));
    return false;
  }

  return true;
}

(async () => {
  const publicSucceeded = await run('public');
  const serverSucceeded = await run('server');

  if (!publicSucceeded || !serverSucceeded) {
    process.exitCode = 1;
  }
})();
