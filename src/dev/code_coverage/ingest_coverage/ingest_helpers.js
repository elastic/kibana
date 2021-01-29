/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { always, pretty } from './utils';
import chalk from 'chalk';
import { fromNullable } from './either';
import {
  COVERAGE_INDEX,
  RESEARCH_COVERAGE_INDEX,
  RESEARCH_TOTALS_INDEX,
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
