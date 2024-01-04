/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import globby from 'globby';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';
import yaml from 'js-yaml';
import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';

// const agentNameUpdateMap: Record<string, string> = {
//   'kibana-default': 'n2-standard-2',
//   'n2-16-spot': 'n2-standard-16',
//   'n2-4-spot': 'n2-standard-4',
//   'n2-8-spot': 'n2-standard-8',
// };
let agentNameUpdateMap: Record<string, { machineType: string; buildPath?: string }> = {};
if (fs.existsSync('data/agents.json')) {
  const agents = JSON.parse(fs.readFileSync('data/agents.json', 'utf8'));
  agentNameUpdateMap = agents.gcp.agents.reduce((acc: typeof agentNameUpdateMap, agent: any) => {
    acc[agent.queue] = { machineType: agent.machineType };
    if (agent.buildPath) {
      acc[agent.queue].buildPath = agent.buildPath;
    }
    return acc;
  }, {});
} else {
  throw new Error(
    'data/agents.json does not exist - download it from https://github.com/elastic/kibana-buildkite/blob/main/agents.json'
  );
}

const DRY_RUN = !process.argv.includes('--force');

const isOldStyleAgentTargetingRule = (step: any) => {
  return (
    step.agents && Object.keys(step.agents).length === 1 && Object.keys(step.agents)[0] === 'queue'
  );
};

/**
 * Finds all .yml files in the .buildkite folder,
 * rewrites all agent targeting rules from the shorthands to the full targeting syntax
 */
run(
  async ({ log }) => {
    const paths = await globby('.buildkite/**/*.yml', {
      cwd: REPO_ROOT,
      onlyFiles: true,
      gitignore: true,
    });

    /**
     * For each path:
     *  - open the file, read the yaml
     *  - if there are no steps, skip
     *  - if all steps' agents are old-style, and the same (only 'queue' key), remove these, add a global agent targeting rule
     *  - if any individual step has an old-style, rewrite it to the new style
     */
    const promises: Array<Promise<void>> = [];
    for (const ymlPath of paths) {
      await rewriteFile(ymlPath, log).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Failed to rewrite: ' + ymlPath, e);
      });
      // promises.push(rewriteFile(ymlPath));
    }
    await Promise.all(promises);
  },
  {
    flags: {
      allowUnexpected: true,
    },
    description: `
    Rewrites all agent targeting rules from the shorthands to the full targeting syntax
  `,
  }
)
  .then((log) => {
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Nem Szuccsesz', err);
    process.exit(1);
  });

async function rewriteFile(ymlPath: string, log: ToolingLog) {
  let file = await readFile(resolve(REPO_ROOT, ymlPath), 'utf-8');
  log.info('Loading: ' + ymlPath);
  const doc = yaml.safeLoad(file);

  if (!doc.steps) {
    log.info('No steps, skipping: ' + ymlPath);
    return;
  }

  const steps = doc.steps as any[];

  // const shouldHaveGlobalRule =
  //   steps.every(isOldStyleAgentTargetingRule) &&
  //   steps.every((step) => step.agents.queue === steps[0].agents.queue);

  // if (shouldHaveGlobalRule) {
  //   const globalAgentRule = getFullAgentTargetingRule(steps[0].agents.queue);
  //   file = file.replaceAll(
  //     new RegExp(`/queue:\n${steps[0].agents.queue}`, 'g'),
  //     yaml.safeDump({ queue: globalAgentRule })
  //   );
  // } else {
  for (const step of steps) {
    if (isOldStyleAgentTargetingRule(step)) {
      log.info('Rewriting: ' + ymlPath, step);
      file = editYmlInPlace(file, [`queue: ${step.agents.queue}`], () => {
        return yaml.safeDump({ queue: getFullAgentTargetingRule(step.agents.queue) }).split('\n');
      });
    }
  }
  log.info('Rewriting: ' + ymlPath);
  // }

  if (DRY_RUN) {
    await writeFile(resolve(REPO_ROOT, ymlPath + '.new'), file);
  } else {
    await writeFile(resolve(REPO_ROOT, ymlPath), file);
  }
}

function editYmlInPlace(
  ymlContentString: string,
  matchLines: Array<string | RegExp>,
  editFn: (lines: string[]) => string[]
) {
  const lines = ymlContentString.split('\n');
  const matchLength = matchLines.length;

  for (let i = 0; i < lines.length; i++) {
    const inspectedLines = lines.slice(i, i + matchLength);
    if (inspectedLines.every((l, j) => l.match(matchLines[j]))) {
      const indent = inspectedLines[0]?.match(/^\s+/)?.[0] || '';
      const editedLines = editFn(lines);
      if (editedLines.at(-1) === '') {
        editedLines.pop();
      }

      lines.splice(i, matchLength, ...editedLines.map((e) => indent + e));
      i += editedLines.length - 1;
    }
  }

  return lines.join('\n');
}

function getFullAgentTargetingRule(queue: string) {
  return {
    provider: 'gcp',
    preemptible: true,
    image: 'family/kibana-ubuntu-2004',
    imageProject: 'elastic-images-qa',
    ...agentNameUpdateMap[queue],
  };
}
