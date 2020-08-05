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

import { always, pretty } from './utils';
import chalk from 'chalk';
import { fromNullable } from './either';
import {
  COVERAGE_INDEX,
  RESEARCH_COVERAGE_INDEX,
  RESEARCH_TOTALS_INDEX,
  TEAM_ASSIGNMENT_PIPELINE_NAME,
  TOTALS_INDEX,
} from './constants';

export function errMsg(index, redacted, body, e) {
  const orig = fromNullable(e.body).fold(
    always(''),
    () => `### Orig Err:\n${pretty(e.body.error)}`
  );

  const red = color('red');

  return `
### ES HOST (redacted): \n\t${red(redacted)}
### INDEX: \n\t${red(index)}
### Partial orig err stack: \n\t${partial(e.stack)}
### Item BODY:\n${pretty(body)}
${orig}

### Troubleshooting Hint:
${red('Perhaps the coverage data was not merged properly?\n')}

### Error.meta (stringified):
${pretty(e.meta)}
`;
}

function partial(x) {
  return x.split('\n').splice(0, 2).join('\n');
}

export function redact(x) {
  const url = new URL(x);
  if (url.password) {
    return `${url.protocol}//${url.host}`;
  } else {
    return x;
  }
}

function color(whichColor) {
  return function colorInner(x) {
    return chalk[whichColor].bgWhiteBright(x);
  };
}

export function maybeTeamAssign(isACoverageIndex, body) {
  const doAddTeam = isACoverageIndex ? true : false;
  const payload = doAddTeam ? { ...body, pipeline: TEAM_ASSIGNMENT_PIPELINE_NAME } : body;
  return payload;
}

export function whichIndex(isResearchJob) {
  return (isTotal) =>
    isTotal ? whichTotalsIndex(isResearchJob) : whichCoverageIndex(isResearchJob);
}
function whichTotalsIndex(isResearchJob) {
  return isResearchJob ? RESEARCH_TOTALS_INDEX : TOTALS_INDEX;
}

function whichCoverageIndex(isResearchJob) {
  return isResearchJob ? RESEARCH_COVERAGE_INDEX : COVERAGE_INDEX;
}
