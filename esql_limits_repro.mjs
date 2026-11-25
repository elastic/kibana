/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ES = process.env.ES_URL || 'http://localhost:9200';
const auth =
  'Basic ' +
  Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString(
    'base64'
  );

const run = async (query) => {
  const res = await fetch(`${ES}/_query`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  return res.ok ? 'ok' : body.error.reason.split('\n').pop().slice(0, 120);
};

const largestThatWorks = async (build, max) => {
  let lo = 1;
  let hi = max;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((await run(build(mid))) === 'ok') lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

const andChain = (n) =>
  `ROW c = "x" | WHERE ${Array.from({ length: n }, (_, i) => `NOT (c == "v${i}")`).join(' AND ')}`;
const orChain = (n) =>
  `ROW c = "x" | WHERE NOT (${Array.from({ length: n }, (_, i) => `c == "v${i}"`).join(' OR ')})`;
const stages = (n) => `ROW c = "x"${' | WHERE c IS NOT NULL'.repeat(n)}`;

const main = async () => {
  const version = await (await fetch(ES, { headers: { Authorization: auth } })).json();
  console.log(`Elasticsearch ${version.version.number}\n`);

  const and = await largestThatWorks(andChain, 1000);
  console.log(
    `1. expression depth, ANDed conditions in one WHERE: works up to ${and}, fails at ${and + 1}`
  );
  console.log(`   ${await run(andChain(and + 1))}`);

  const or = await largestThatWorks(orChain, 1000);
  console.log(
    `2. expression depth, ORed values in one WHERE:      works up to ${or}, fails at ${or + 1}`
  );
  console.log(`   ${await run(orChain(or + 1))}`);

  const both = await run(
    `ROW c = "x" | WHERE ${[
      `NOT (${Array.from({ length: 150 }, (_, i) => `c == "a${i}"`).join(' OR ')})`,
      ...Array.from({ length: 150 }, (_, i) => `NOT (c == "b${i}")`),
    ].join(' AND ')}`
  );
  console.log(
    `3. one 150-value OR first, then 150 ANDed conditions (300 elements in total): ${both}`
  );

  const st = await largestThatWorks(stages, 1000);
  console.log(`4. pipeline stages (| WHERE after ROW): works up to ${st}, fails at ${st + 1}`);
  console.log(`   ${await run(stages(st + 1))}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
