/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';

const parseTarget = process.argv[2] ?? 'BUILDKITE_MESSAGE';
const alsoAnnotate = process.argv[3] ?? false;

const prNumWithinMsgRe = /\(\#(\d+)\)/;
// @ts-expect-error
const firstMatch = (x: string) => x[0].match(prNumWithinMsgRe)[1];
const head = (x: string): string[] => x.split('\n');
const parseInt10 = (x: string) => parseInt(x, 10);
export type PrNumber = string | number;
const fetchLabels = (prNumber: PrNumber) =>
  execSync(`gh pr view '${prNumber}' --json labels | jq '.labels[].name'`)
    .toString()
    .trim()
    .split('\n')
    .map((x: string) => x.replaceAll('"', ''))
    .join(' ');

try {
  const labels = pipe(head, firstMatch, parseInt10, fetchLabels)(`${process.env[parseTarget]}`);
  if (labels) {
    execSync(`buildkite-agent meta-data set gh_labels ${labels}`);
    if (alsoAnnotate)
      execSync(
        `buildkite-agent annotate --context 'default' --style 'info' "Github Labels: ${labels}"`
      );
  }
} catch (e) {
  console.error(`Error fetching Github Labels for issue ${firstMatch}`);
}

export {};

function pipe(...fns: any[]) {
  return fns.reduce(
    (f, g) =>
      (...args: any[]) =>
        g(f(...args))
  );
}
