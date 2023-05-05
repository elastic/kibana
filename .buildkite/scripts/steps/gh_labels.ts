/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';

const parseTarget = process.argv[2] ?? 'BUILDKITE_MESSAGE';
// console.log(`\n### process.env.BUILDKITE_MESSAGE:
// ${process.env[parseTarget]}`);

// @ts-expect-error
const parse = (x: string) => x[0].match(prNumWithinMsgRe)[1];
const fetchLabels = (prNumber: string | number) =>
  execSync(
    `curl -s https://api.github.com/repos/elastic/kibana/issues/${prNumber} | jq '.labels[].name'`
  )
    .toString()
    .trim()
    .split('\n')
    .map((x: string) => x.replaceAll('"', ''));

const head = (x: string): string[] => x.split('\n');
const prNumWithinMsgRe = /\(\#(\d+)\)/;
// const setMeta = (x: string) => execSync(`buildkite-agent meta-data set gh_labels ${x}`);

try {
  const labels = pipe(head, parse, parseInt, fetchLabels)(`${process.env[parseTarget]}`);
  execSync(`buildkite-agent meta-data set gh_labels ${labels}`);
  execSync(`buildkite-agent annotate --context 'gh_labels_context' ${labels}`);
  console.log('\n--- Labels from GET:');
  const fetched = execSync(`buildkite-agent meta-data get gh_labels`).toString();
  console.log(`\n### fetched: \n  ${fetched}`);
} catch (e) {
  console.log('\n### Whoops, something happenned, prolly with jq:');
  console.log(`\n### Error (stringified): \n${JSON.stringify(e, null, 2)}`);
}

export {};

function pipe(...fns: any[]) {
  return fns.reduce(
    (f, g) =>
      (...args: any[]) =>
        g(f(...args))
  );
}
