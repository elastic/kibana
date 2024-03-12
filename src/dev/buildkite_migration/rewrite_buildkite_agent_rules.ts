/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

import globby from 'globby';
import yaml from 'js-yaml';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

interface BuildkiteStepFull {
  agents: { queue: string };
}
interface BuildkiteStepPartial {
  agents?: { queue?: string };
}

interface KBAgentDef {
  queue: string;
  name: string;
  machineType: string;
  minimumAgents?: number;
  maximumAgents?: number;
  idleTimeoutMins?: number;
  // exitAfterOneJob?: boolean;
  disableExternalIp?: boolean;
  localSsds?: number;
  buildPath?: string;
  diskType?: string;
  diskSizeGb?: number;
  spot?: boolean;
  zones?: string[];
  nestedVirtualization?: boolean;
}
type KibanaBuildkiteAgentLookup = Record<string, KBAgentDef>;

interface GobldGCPConfig {
  assignExternalIP?: boolean;
  diskSizeGb?: number;
  diskType?: string;
  enableSecureBoot?: boolean;
  enableNestedVirtualization?: boolean;
  image: string;
  provider: 'gcp';
  localSsds?: number;
  localSsdInterface?: string;
  machineType: string;
  minCpuPlatform?: string;
  imageProject: string;
  networkTags?: string[];
  preemptible?: boolean;
  schedulingNodeAffinity?: Record<string, string>;
  serviceAccount?: string;
  zones?: string[];
}

const DRY_RUN = process.argv.includes('--dry-run');

if (!fs.existsSync('data/agents.json')) {
  throw new Error(
    'data/agents.json does not exist - download it from https://github.com/elastic/kibana-buildkite/blob/main/agents.json'
  );
}

/**
 * Finds all .yml files in the .buildkite folder,
 * rewrites all agent targeting rules from the shorthands to the full targeting syntax
 */
run(
  async ({ log, flags, flagsReader }) => {
    const filterExpressions = flagsReader.getPositionals();

    const paths = await globby('.buildkite/**/*.yml', {
      cwd: REPO_ROOT,
      onlyFiles: true,
      gitignore: true,
    });

    const pathsFiltered =
      filterExpressions.length === 0
        ? paths
        : paths.filter((path) => {
            return filterExpressions.some((expression) => path.includes(expression));
          });

    if (pathsFiltered.length === 0) {
      log.warning('No .yml files found to rewrite after filtering.');
      return;
    }

    log.info('Applying rewrite to the following paths: \n', pathsFiltered.join('\n'));

    const failedRewrites: Array<{ path: string; error: Error }> = [];

    const rewritePromises: Array<Promise<void>> = pathsFiltered.map((ymlPath) => {
      return rewriteFile(ymlPath, log).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Failed to rewrite: ' + ymlPath, e);
        failedRewrites.push({
          path: ymlPath,
          error: e,
        });
      });
    });

    await Promise.all(rewritePromises);

    log.info(`Rewriting definitions complete with ${failedRewrites.length} errors.`);

    if (failedRewrites.length) {
      log.warning('Failed rewrites:', ...failedRewrites);
    }

    log.success('Done!');
  },
  {
    flags: {
      allowUnexpected: true,
    },
    description: `
    Rewrites all agent targeting rules from the shorthands to the full targeting syntax
  `,
  }
).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failure:', err);
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

  for (const step of doc.steps as BuildkiteStepPartial[]) {
    if (isQueueTargetingRule(step) && !step.agents.queue.startsWith('kb-static')) {
      log.info('Rewriting: ' + ymlPath, step);
      file = editYmlInPlace(file, ['agents:', `queue: ${step.agents.queue}`], () => {
        return yaml.safeDump({ agents: getFullAgentTargetingRule(step.agents.queue) }).split('\n');
      });
    }
  }

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
    if (inspectedLines.every((l, j) => l.match(matchLines[j]) && !l.trim().startsWith('#'))) {
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

let agentNameUpdateMap: KibanaBuildkiteAgentLookup;
function getFullAgentTargetingRule(queue: string): GobldGCPConfig {
  if (!agentNameUpdateMap) {
    const agents = JSON.parse(fs.readFileSync('data/agents.json', 'utf8'));
    agentNameUpdateMap = agents.gcp.agents.reduce(
      (acc: KibanaBuildkiteAgentLookup, agent: KBAgentDef) => {
        acc[agent.queue] = agent;
        return acc;
      },
      {}
    );
  }

  const agent = agentNameUpdateMap[queue];
  if (!agent) {
    throw new Error(`Unknown agent: ${queue}`);
  }

  // Mapping based on expected fields in https://github.com/elastic/ci/blob/0df8430357109a19957dcfb1d867db9cfdd27937/docs/gobld/providers.mdx#L96
  return removeNullish({
    image: 'family/kibana-ubuntu-2004',
    imageProject: 'elastic-images-qa',
    provider: 'gcp',
    assignExternalIP: agent.disableExternalIp === true ? false : undefined,
    diskSizeGb: agent.diskSizeGb,
    diskType: agent.diskType,
    enableNestedVirtualization: agent.nestedVirtualization,
    localSsds: agent.localSsds,
    machineType: agent.machineType,
    preemptible: agent.spot,
  });
}

function isQueueTargetingRule(step: BuildkiteStepPartial): step is BuildkiteStepFull & boolean {
  return !!(
    step.agents &&
    Object.keys(step.agents).length === 1 &&
    Object.keys(step.agents)[0] === 'queue'
  );
}

function removeNullish<T extends object>(obj: T): T {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value != null && typeof value !== 'undefined') {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
}
