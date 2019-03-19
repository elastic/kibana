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

import { createWriteStream } from 'fs';
import { URL } from 'url';

import axios from 'axios';
import chalk from 'chalk';
import cheerio from 'cheerio';

import { createPromiseFromStreams } from '../../legacy/utils/streams';
import { createFlagError, run } from '../run';

run(
  async ({ flags, log }) => {
    const jobUrl = new URL(flags._[0], 'https://kibana-ci.elastic.co/job/');

    const pathSegments = jobUrl.pathname.split('/');
    if (
      pathSegments[1] !== 'job' ||
      !pathSegments[2] ||
      !Number.isInteger(parseInt(pathSegments[3], 10)) ||
      pathSegments.length < 4
    ) {
      throw createFlagError('Invalid job url, expected path to match /job/{jobId}/{buildNumber}');
    }

    const outputPath = flags.output!;
    if (Array.isArray(outputPath) || typeof outputPath === 'boolean') {
      throw createFlagError('--output can only be specified once and must have a value');
    }

    const [, , jobId, buildNum] = pathSegments;

    log.info('Fetching job info from %s#%s', jobId, buildNum);
    const jobResp = await axios.request({
      method: 'GET',
      url: jobUrl.href,
    });

    const $ = cheerio.load(jobResp.data);
    const matrixJobIds = $('#matrix a')
      .toArray()
      .map(a =>
        $(a)
          .attr('href')
          .split('/')
          .find(seg => seg.includes('JOB='))
      )
      .filter((a): a is string => !!a)
      .sort((a, b) => a.localeCompare(b));

    const gcs = axios.create({
      baseURL: `https://storage.googleapis.com/kibana-ci-artifacts/jobs/${encodeURIComponent(
        jobId
      )}/`,
    });

    log.indent(4);

    for (const matrixJobId of matrixJobIds) {
      const objResp = await gcs.request({
        method: 'GET',
        url: `${encodeURIComponent(
          matrixJobId
        )}/${buildNum}/kibana/target/junit/test-summary.ndjson`,
        responseType: 'stream',
        validateStatus: status => status === 200 || status === 404,
      });

      if (objResp.status === 404) {
        log.warning(matrixJobId, chalk.red('NOT FOUND'));
        continue;
      }

      await createPromiseFromStreams([
        objResp.data,
        createWriteStream(outputPath, {
          flags: 'a',
        }),
      ]);

      log.success(matrixJobId);
    }

    log.indent(-4);
  },
  {
    flags: {
      default: {
        output: 'test-summary.ndjson',
      },
      help: `
        --output           Customize the output path, relative to cwd, defaults to test-summary.ndjson
      `,
    },
    description: `
      Pass the URL to a Jenkins job and all of the test-summary.ndjson files will be collected and
      combined into a single test-summary.ndjson file in the CWD (customize with --output)
    `,
  }
);
