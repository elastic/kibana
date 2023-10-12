/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

async function main() {
  const [outputPath, commitsToList] = process.argv.slice(2);

  console.log('--- Collecting recent kibana commits');

  const kibanaDir = execSync('git rev-parse --show-toplevel').toString().trim();
  const exec = (command: string) =>
    execSync(command, { encoding: 'utf-8', cwd: kibanaDir }).toString().trim();

  const currentKibanaCommit = exec('git rev-parse HEAD');
  const kibanaCommits = exec(`git log --pretty=format:"%s<@>%H" -n ${commitsToList}`);

  const kibanaCommitList = kibanaCommits.split('\n').map((commit) => {
    const [message, hash] = commit.split('<@>');
    return { message, hash };
  });

  const payload = {
    commits: kibanaCommitList,
    currentKibanaCommit,
  };

  writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`Wrote commit data to ${outputPath}`);
}

main()
  .then(() => {
    console.log('Done');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
