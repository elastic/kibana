/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

import type { GenerateCommand } from '../generate_command';

const SNIPPETS_DIR = Path.resolve(REPO_ROOT, 'docs/reference/workflows');
const TRIGGER_INDEX_FILE = Path.join(SNIPPETS_DIR, 'trigger-definitions-index.md');
const LEGACY_TRIGGER_LIST_FILE = Path.join(SNIPPETS_DIR, 'trigger-definitions-list.md');
const REFERENCE_TOC_FILE = Path.resolve(REPO_ROOT, 'docs/reference/toc.yml');

const WORKFLOW_TRIGGER_TOC_BEGIN_SENTINEL = 'workflow-trigger-docs-toc:begin';
const WORKFLOW_TRIGGER_TOC_END_SENTINEL = 'workflow-trigger-docs-toc:end';

const DEFAULT_KIBANA_URL = 'http://localhost:5601';
const DEFAULT_KIBANA_AUTH = 'elastic:changeme';

const TRIGGER_DEFINITIONS_PATH = '/internal/workflows_extensions/trigger_definitions';

interface TriggerDocMetadata {
  details?: string;
  examples?: string[];
}

interface TriggerSnippets {
  condition?: string;
}

interface EventPayloadProperty {
  name: string;
  required: boolean;
  type: string;
  description?: string;
}

interface TriggerDefinitionResponseItem {
  id: string;
  schemaHash: string;
  title?: string;
  description?: string;
  documentation?: TriggerDocMetadata;
  snippets?: TriggerSnippets;
  eventPayload?: EventPayloadProperty[];
}

interface TriggerDefinitionsResponse {
  triggers: TriggerDefinitionResponseItem[];
}

function getKibanaUrl(): string {
  return process.env.KIBANA_URL ?? DEFAULT_KIBANA_URL;
}

function getKibanaAuth(): string {
  return process.env.KIBANA_AUTH ?? DEFAULT_KIBANA_AUTH;
}

function getAuthHeader(auth: string): string {
  const encoded = Buffer.from(auth, 'utf8').toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Category is the prefix of the trigger id before the first dot (e.g. `workflows.failed` → `workflows`).
 * Triggers with no dot are grouped under `uncategorized`.
 */
function triggerCategoryFromId(id: string): string {
  const dot = id.indexOf('.');
  if (dot === -1) {
    return 'uncategorized';
  }
  const prefix = id.slice(0, dot);
  return prefix.length > 0 ? prefix : 'uncategorized';
}

function triggerCategoryFileBasename(category: string): string {
  const safe = category.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `trigger-definitions-category-${safe}.md`;
}

function triggerCategoryDisplayTitle(category: string): string {
  if (category === 'uncategorized') {
    return 'Uncategorized';
  }
  const withSpaces = category.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function compareTriggerCategories(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}

/** Rewrites the auto-managed trigger category entries in docs/reference/toc.yml. */
function replaceWorkflowTriggerDocsTocChildren(content: string, categories: string[]): string {
  const lines = content.split('\n');
  const beginIndex = lines.findIndex((l) => l.includes(WORKFLOW_TRIGGER_TOC_BEGIN_SENTINEL));
  const endIndex = lines.findIndex((l) => l.includes(WORKFLOW_TRIGGER_TOC_END_SENTINEL));
  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    throw new Error(
      `docs/reference/toc.yml must contain lines with "${WORKFLOW_TRIGGER_TOC_BEGIN_SENTINEL}" and "${WORKFLOW_TRIGGER_TOC_END_SENTINEL}" wrapping workflow trigger category entries.`
    );
  }
  const childLines = categories.map(
    (c) => `      - file: workflows/${triggerCategoryFileBasename(c)}`
  );
  return [...lines.slice(0, beginIndex + 1), ...childLines, ...lines.slice(endIndex)].join('\n');
}

async function syncWorkflowTriggerDocsToc(
  categories: string[],
  log: { info: (msg: string) => void }
): Promise<void> {
  const current = await Fsp.readFile(REFERENCE_TOC_FILE, 'utf8');
  const next = replaceWorkflowTriggerDocsTocChildren(current, categories);
  if (next !== current) {
    await Fsp.writeFile(REFERENCE_TOC_FILE, next, 'utf8');
    log.info(`Updated ${Path.relative(REPO_ROOT, REFERENCE_TOC_FILE)}`);
  }
}

async function fetchTriggerDefinitions(
  url: string,
  authHeader: string
): Promise<TriggerDefinitionsResponse> {
  const fullUrl = `${url.replace(/\/$/, '')}${TRIGGER_DEFINITIONS_PATH}`;
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
    },
  });

  if (!response.ok) {
    throw new Error(
      `GET ${fullUrl} failed: ${response.status} ${response.statusText}. Ensure Kibana is running and a page that loads the workflows app has been opened so trigger doc metadata is pushed.`
    );
  }

  const body = (await response.json()) as unknown;
  if (typeof body !== 'object' || body === null || !('triggers' in body)) {
    throw new Error(`Unexpected response shape: expected { triggers: [...] }`);
  }
  const triggers = (body as { triggers: unknown }).triggers;
  if (!Array.isArray(triggers)) {
    throw new Error(`Response "triggers" must be an array`);
  }
  return { triggers };
}

function renderTriggerSection(trigger: TriggerDefinitionResponseItem): string {
  const title = trigger.title ?? trigger.id;
  const description = trigger.description ?? '';
  const details = trigger.documentation?.details ?? description;
  const examples = trigger.documentation?.examples ?? [];
  const condition = trigger.snippets?.condition;

  const lines: string[] = [`## ${title}`, '', details, ''];

  const eventPayload = trigger.eventPayload;
  if (eventPayload !== undefined && eventPayload.length > 0) {
    const hasDescriptions = eventPayload.some((p) => p.description);
    lines.push('### Event payload', '');
    const header = hasDescriptions
      ? '| Property | Type | Required | Description |'
      : '| Property | Type | Required |';
    const separator = hasDescriptions ? '| --- | --- | --- | --- |' : '| --- | --- | --- |';
    lines.push(header, separator);
    for (const p of eventPayload) {
      const required = p.required ? 'Yes' : 'Optional';
      const desc = p.description ?? '';
      if (hasDescriptions) {
        lines.push(`| \`${p.name}\` | ${p.type} | ${required} | ${desc} |`);
      } else {
        lines.push(`| \`${p.name}\` | ${p.type} | ${required} |`);
      }
    }
    lines.push('');
  }

  const hasCondition = condition !== undefined && condition !== '';

  if (hasCondition) {
    lines.push(
      '### Minimal configuration',
      '',
      `When using \`${trigger.id}\`, we recommend using the following minimal configuration:`,
      '',
      '```yaml',
      `triggers:`,
      `  - type: ${trigger.id}`,
      `    on:`,
      `      condition: '${condition.replace(/'/g, "''")}'`,
      '```',
      ''
    );
  }

  if (examples.length > 0) {
    lines.push('### Examples', '');
    for (const example of examples) {
      const marked = example.trim().replace(/^## /gm, '#### ');
      lines.push(marked, '');
    }
  }

  return lines.join('\n');
}

function sortTriggers(triggers: TriggerDefinitionResponseItem[]): TriggerDefinitionResponseItem[] {
  return [...triggers].sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

function renderIndexDocument(
  sorted: TriggerDefinitionResponseItem[],
  categories: string[]
): string {
  const header = '<!-- To regenerate, run: node scripts/generate workflow-trigger-docs -->';
  const intro = 'Event-driven triggers start a workflow when an event is emitted.';

  const categoryLinks = categories.map((c) => {
    const title = triggerCategoryDisplayTitle(c);
    const count = sorted.filter((t) => triggerCategoryFromId(t.id) === c).length;
    const file = triggerCategoryFileBasename(c);
    return `- [${title}](${file}) (${count} trigger${count === 1 ? '' : 's'})`;
  });

  const bulletLines = sorted.map((t) => {
    const label = t.title ?? t.id;
    const desc = t.description ?? 'No description.';
    const catTitle = triggerCategoryDisplayTitle(triggerCategoryFromId(t.id));
    const catFile = triggerCategoryFileBasename(triggerCategoryFromId(t.id));
    return `- **${label}** (\`${t.id}\`, ${catTitle}): ${desc} — [${catTitle} triggers](${catFile})`;
  });

  return [
    header,
    '',
    '# Event-driven triggers',
    '',
    intro,
    '',
    '## Browse by category',
    '',
    ...categoryLinks,
    '',
    '## All triggers',
    '',
    ...bulletLines,
    '',
  ].join('\n');
}

function renderCategoryDocument(
  category: string,
  triggersInCategory: TriggerDefinitionResponseItem[]
): string {
  const header = '<!-- To regenerate, run: node scripts/generate workflow-trigger-docs -->';
  const display = triggerCategoryDisplayTitle(category);
  const intro = `Triggers in the ${display} category.`;
  const sorted = sortTriggers(triggersInCategory);
  const sections = sorted.map(renderTriggerSection);

  return [header, '', `# ${display} event triggers`, '', intro, '', ...sections].join('\n');
}

export const WorkflowTriggerDocsCommand: GenerateCommand = {
  name: 'workflow-trigger-docs',
  description:
    'Generate workflow trigger definitions doc. Requires Kibana running and the workflows app to have been loaded at least once so trigger doc metadata is pushed.',
  usage: 'node scripts/generate workflow-trigger-docs',
  async run({ log }) {
    const url = getKibanaUrl();
    const auth = getKibanaAuth();
    const authHeader = getAuthHeader(auth);

    log.info(`Fetching trigger definitions from ${url}${TRIGGER_DEFINITIONS_PATH} ...`);
    const { triggers } = await fetchTriggerDefinitions(url, authHeader);
    log.info(`Got ${triggers.length} trigger(s).`);

    for (const trigger of triggers) {
      if (typeof trigger.id !== 'string' || trigger.id.length === 0) {
        throw new Error('Trigger definition is missing a non-empty id in the API response.');
      }
    }

    const sorted = sortTriggers(triggers);
    const categories = [...new Set(triggers.map((t) => triggerCategoryFromId(t.id)))].sort(
      compareTriggerCategories
    );

    await Fsp.mkdir(SNIPPETS_DIR, { recursive: true });

    try {
      await Fsp.unlink(LEGACY_TRIGGER_LIST_FILE);
      log.info(`Removed legacy ${Path.relative(REPO_ROOT, LEGACY_TRIGGER_LIST_FILE)}`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    const expectedCategoryFiles = new Set<string>();

    for (const category of categories) {
      const triggersInCategory = triggers.filter((t) => triggerCategoryFromId(t.id) === category);
      const basename = triggerCategoryFileBasename(category);
      expectedCategoryFiles.add(basename);
      const outPath = Path.join(SNIPPETS_DIR, basename);
      await Fsp.writeFile(outPath, renderCategoryDocument(category, triggersInCategory), 'utf8');
      log.info(`Wrote ${Path.relative(REPO_ROOT, outPath)}`);
    }

    const entries = await Fsp.readdir(SNIPPETS_DIR, { withFileTypes: true });
    const staleCategorySnippets = entries.filter(
      (ent) =>
        ent.isFile() &&
        ent.name.startsWith('trigger-definitions-category-') &&
        ent.name.endsWith('.md') &&
        !expectedCategoryFiles.has(ent.name)
    );
    for (const ent of staleCategorySnippets) {
      await Fsp.unlink(Path.join(SNIPPETS_DIR, ent.name));
      log.info(`Removed stale snippet ${ent.name}`);
    }

    const indexMarkdown = renderIndexDocument(sorted, categories);
    await Fsp.writeFile(TRIGGER_INDEX_FILE, indexMarkdown, 'utf8');
    log.success(`Wrote ${Path.relative(REPO_ROOT, TRIGGER_INDEX_FILE)}`);

    await syncWorkflowTriggerDocsToc(categories, log);
  },
};
