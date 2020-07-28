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

import Fs from 'fs';
import Path from 'path';
import { inspect } from 'util';

import { run, createFlagError, createFailError, REPO_ROOT } from '@kbn/dev-utils';

import { FORMATS, SomeFormat } from './formats';
import {
  iterRelevantPullRequests,
  getPr,
  Version,
  ClassifiedPr,
  streamFromIterable,
  asyncPipeline,
  IrrelevantPrSummary,
  isPrRelevant,
  classifyPr,
} from './lib';

const rootPackageJson = JSON.parse(
  Fs.readFileSync(Path.resolve(REPO_ROOT, 'package.json'), 'utf8')
);
const extensions = FORMATS.map((f) => f.extension);

export function runReleaseNotesCli() {
  run(
    async ({ flags, log }) => {
      const token = flags.token;
      if (!token || typeof token !== 'string') {
        throw createFlagError('--token must be defined');
      }

      const version = Version.fromFlag(flags.version);
      if (!version) {
        throw createFlagError('unable to parse --version, use format "v{major}.{minor}.{patch}"');
      }

      const includeVersions = Version.fromFlags(flags.include || []);
      if (!includeVersions) {
        throw createFlagError('unable to parse --include, use format "v{major}.{minor}.{patch}"');
      }

      const Formats: SomeFormat[] = [];
      for (const flag of Array.isArray(flags.format) ? flags.format : [flags.format]) {
        const Format = FORMATS.find((F) => F.extension === flag);
        if (!Format) {
          throw createFlagError(`--format must be one of "${extensions.join('", "')}"`);
        }
        Formats.push(Format);
      }

      const filename = flags.filename;
      if (!filename || typeof filename !== 'string') {
        throw createFlagError('--filename must be a string');
      }

      if (flags['debug-pr']) {
        const number = parseInt(String(flags['debug-pr']), 10);
        if (Number.isNaN(number)) {
          throw createFlagError('--debug-pr must be a pr number when specified');
        }

        const summary = new IrrelevantPrSummary(log);
        const pr = await getPr(token, number);
        log.success(
          inspect(
            {
              version: version.label,
              includeVersions: includeVersions.map((v) => v.label),
              isPrRelevant: isPrRelevant(pr, version, includeVersions, summary),
              ...classifyPr(pr, log),
              pr,
            },
            { depth: 100 }
          )
        );
        summary.logStats();
        return;
      }

      log.info(`Loading all PRs with label [${version.label}] to build release notes...`);

      const summary = new IrrelevantPrSummary(log);
      const prsToReport: ClassifiedPr[] = [];
      const prIterable = iterRelevantPullRequests(token, version, log);
      for await (const pr of prIterable) {
        if (!isPrRelevant(pr, version, includeVersions, summary)) {
          continue;
        }
        prsToReport.push(classifyPr(pr, log));
      }
      summary.logStats();

      if (!prsToReport.length) {
        throw createFailError(
          `All PRs with label [${version.label}] were filtered out by the config. Run again with --debug for more info.`
        );
      }

      log.info(`Found ${prsToReport.length} prs to report on`);

      for (const Format of Formats) {
        const format = new Format(version, prsToReport, log);
        const outputPath = Path.resolve(`${filename}.${Format.extension}`);
        await asyncPipeline(streamFromIterable(format.print()), Fs.createWriteStream(outputPath));
        log.success(`[${Format.extension}] report written to ${outputPath}`);
      }
    },
    {
      usage: `node scripts/release_notes --token {token} --version {version}`,
      flags: {
        alias: {
          version: 'v',
          include: 'i',
        },
        string: ['token', 'version', 'format', 'filename', 'include', 'debug-pr'],
        default: {
          filename: 'report',
          version: rootPackageJson.version,
          format: extensions,
        },
        help: `
          --token            (required) The Github access token to use for requests
          --version, -v      The version to fetch PRs by, PRs with version labels prior to
                             this one will be ignored (see --include-version) (default ${
                               rootPackageJson.version
                             })
          --include, -i      A version that is before --version but shouldn't be considered
                             "released" and cause PRs with a matching label to be excluded from
                             release notes. Use this when PRs are labeled with a version that
                             is less that --version and is expected to be released after
                             --version, can be specified multiple times.
          --format           Only produce a certain format, options: "${extensions.join('", "')}"
          --filename         Output filename, defaults to "report"
          --debug-pr         Fetch and print the details for a single PR, disabling reporting
        `,
      },
      description: `
        Fetch details from Github PRs for generating release notes
      `,
    }
  );
}
