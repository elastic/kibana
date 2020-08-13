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

import expect from '@kbn/expect';
import { enumeratePatterns } from '../team_assignment/enumerate_patterns';
import { resolve } from 'path';
import { ToolingLog } from '@kbn/dev-utils';

const ROOT = resolve(__dirname, '../../../../..');
const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

describe(`enumeratePatterns`, () => {
  it(`should enumerate`, () => {
    const res = enumeratePatterns(ROOT)(log)(patternsMap());
    const actual = res[0][0];
    expect(actual).to.eql(expected()[0][0]);
  });
  it(`should not throw an unhandled error on a file path that is a glob, that expands to nothing`, () => {
    const absoluteRoot = '/Users/tre/development/projects/kibana';
    expect(
      enumeratePatterns(absoluteRoot)(log)(
        new Map([
          [
            'src/legacy/core_plugins/kibana/public/home/*.ts',
            {
              coverageOwner: 'kibana-core-ui',
              excludeFiles: [],
            },
          ],
        ])
      )
    ).to.eql('');
  });
  it(`should resolve x-pack/plugins/reporting/server/browsers/extract/unzip.js to kibana-reporting`, () => {
    const actual = enumeratePatterns(ROOT)(log)(
      new Map([
        [
          'x-pack/plugins/reporting',
          {
            coverageOwner: 'kibana-reporting',
            excludeFiles: [],
          },
        ],
      ])
    );

    expect(
      actual[0].includes(
        'x-pack/plugins/reporting/server/browsers/extract/unzip.js kibana-reporting'
      )
    ).to.be(true);
  });
});

function patternsMap() {
  return new Map([
    [
      'src/dev/code_coverage',
      {
        coverageOwner: 'kibana-qa',
        excludeFiles: [],
      },
    ],
    [
      'vars/kibanaCoverage.groovy',
      {
        coverageOwner: 'kibana-qa',
        excludeFiles: [],
      },
    ],
    [
      'vars/kibanaTeamAssign.groovy',
      {
        coverageOwner: 'kibana-qa',
        excludeFiles: [],
      },
    ],
  ]);
}

function expected() {
  return [
    [
      'src/dev/code_coverage/ingest_coverage/constants.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/either.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/index.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/ingest-coverage_wallaby.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/ingest.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/ingest_helpers.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/integration_tests/ingest_coverage.test.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/json_stream.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/matching.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/maybe.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/process.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/team_assignment/enumerate_patterns.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/team_assignment/enumeration_helpers.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/team_assignment/flush.ts kibana-qa',
      'src/dev/code_coverage/ingest_coverage/team_assignment/generate_assignments.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/team_assignment/generate_patterns.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/team_assignment/get_data.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/team_assignment/index.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/transforms.js kibana-qa',
      'src/dev/code_coverage/ingest_coverage/utils.js kibana-qa',
      'src/dev/code_coverage/nyc_config/nyc.functional.config.js kibana-qa',
      'src/dev/code_coverage/nyc_config/nyc.jest.config.js kibana-qa',
    ],
  ];
}
