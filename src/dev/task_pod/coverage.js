/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// node scripts/task_pod_coverage [--family <name>] [--strict]
// A static look at who contributes to a task pod family: the plugins that register into the family's
// registries (workflow steps, connector types, agent builder tools and skills) and whether each has a
// `server/tasks` entry and is listed in the family manifest. A contributor that is missing from the
// pod is not there at run time: its steps fail by name. --strict exits 1 when any are missing.
require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');
const { getPackages } = require('@kbn/repo-packages');

// family -> the plugin id whose manifest lists it, what a contributor depends on, and what it calls
const FAMILIES = {
  connectors: {
    owner: 'actions',
    dependsOn: ['actions'],
    // `registerType` alone is also how rule types register, so it must be called on `actions`.
    pattern:
      /\bregisterSubActionConnectorType\(|\b(?:actions|actionsSetup|actionsPlugin)\??\.registerType\(/,
  },
  workflows: {
    owner: 'workflowsExecutionEngine',
    dependsOn: ['workflowsExtensions'],
    pattern: /\b(?:registerStepDefinition|registerTriggerDefinition)\b/,
  },
  agent_builder: {
    owner: 'agentBuilder',
    dependsOn: ['agentBuilder'],
    pattern:
      /\b(?:tools|skills|attachments|agents|hooks|conversationEvents|renderers)\.(?:register|registerType|registerCycleHook)\(|\bregisterTool\(|\bregisterAttachmentType\(|\bregisterSkill\(/,
  },
};

// Contributors that are deliberately not in a pod, and why. A pod that does not serve a connector
// type answers 404 and Task Manager runs the task in Kibana, so a missing system connector is safe.
const NOT_IN_POD = {
  connectors: {
    cases: 'system connector that needs a cases client (Lens, Files, Rule Registry)',
    observabilityAIAssistantApp: 'system connector that needs the whole AI assistant service',
    workflowsManagement: 'system connector that needs the workflows management API',
  },
  agent_builder: {},
};

const args = process.argv.slice(2);
const only = args.includes('--family') ? args[args.indexOf('--family') + 1] : undefined;
const strict = args.includes('--strict');

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'target') walk(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const readJsonc = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, ''));

// Test fixture plugins register into the registries but never run in a pod.
const plugins = getPackages(REPO_ROOT).filter(
  (p) => p.manifest.type === 'plugin' && !/\/(test|examples)\//.test(p.directory)
);
const byId = new Map(plugins.map((p) => [p.manifest.plugin.id, p]));
let missingTotal = 0;

for (const [name, family] of Object.entries(FAMILIES)) {
  if (only && only !== name) continue;
  const owner = byId.get(family.owner);
  const manifestPath = owner && path.join(owner.directory, 'task_pod.jsonc');
  const listed = new Set(
    manifestPath && fs.existsSync(manifestPath) ? readJsonc(manifestPath).plugins : []
  );

  const contributors = plugins.filter((p) => {
    const { requiredPlugins = [], optionalPlugins = [] } = p.manifest.plugin;
    if (p.manifest.plugin.id === family.owner) return false;
    if (!family.dependsOn.some((id) => requiredPlugins.concat(optionalPlugins).includes(id))) {
      return false;
    }
    return walk(path.join(p.directory, 'server')).some((file) =>
      family.pattern.test(fs.readFileSync(file, 'utf8'))
    );
  });

  console.log(
    `\n${name}: ${contributors.length} contributors (manifest: ${owner ? 'found' : 'none'})`
  );
  for (const p of contributors.sort((a, b) =>
    a.manifest.plugin.id.localeCompare(b.manifest.plugin.id)
  )) {
    const id = p.manifest.plugin.id;
    // A tasks entry is declared in the manifest; a plugin's own `server/tasks` folder is not one.
    const hasEntry =
      Boolean(p.manifest.plugin.tasks) &&
      fs.existsSync(path.join(p.directory, 'server/tasks/index.ts'));
    const inFamily = listed.has(id);
    const skipReason = NOT_IN_POD[name] && NOT_IN_POD[name][id];
    if (skipReason) {
      console.log(`  - ${id.padEnd(32)} not in the pod: ${skipReason}`);
      continue;
    }
    let status = 'no tasks entry';
    if (hasEntry) status = inFamily ? 'ok' : 'has tasks entry, not in family';
    if (status !== 'ok') missingTotal++;
    console.log(`  ${status === 'ok' ? '✓' : '✗'} ${id.padEnd(32)} ${status}`);
  }
}

if (strict && missingTotal > 0) {
  console.error(`\n${missingTotal} contributors are not in their pod.`);
  process.exit(1);
}
