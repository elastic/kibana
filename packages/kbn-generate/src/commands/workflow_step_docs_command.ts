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
const LEGACY_STEP_LIST_FILE = Path.join(SNIPPETS_DIR, 'step-definitions-list.md');
const STEP_INDEX_FILE = Path.join(SNIPPETS_DIR, 'step-definitions-index.md');
const REFERENCE_TOC_FILE = Path.resolve(REPO_ROOT, 'docs/reference/toc.yml');

/** Must match the marker line in docs/reference/toc.yml (may include trailing comment text). */
const WORKFLOW_STEP_TOC_BEGIN_SENTINEL = 'workflow-step-docs-toc:begin';
const WORKFLOW_STEP_TOC_END_SENTINEL = 'workflow-step-docs-toc:end';

const DEFAULT_KIBANA_URL = 'http://localhost:5601';
const DEFAULT_KIBANA_AUTH = 'elastic:changeme';

const STEP_DEFINITIONS_PATH = '/internal/workflows_extensions/step_definitions';

/** Matches `StepCategory` in @kbn/workflows (used for stable sort only). */
const STEP_CATEGORY_SORT_ORDER: readonly string[] = [
  'ai',
  'data',
  'elasticsearch',
  'external',
  'flowControl',
  'kibana',
];

const CATEGORY_PAGE_TITLE: Record<string, string> = {
  ai: 'AI',
  data: 'Data',
  elasticsearch: 'Elasticsearch',
  external: 'External',
  flowControl: 'Flow control',
  kibana: 'Kibana',
};

interface StepDocMetadata {
  details?: string;
  examples?: string[];
}

interface SchemaProperty {
  name: string;
  required: boolean;
  type: string;
  description?: string;
}

interface StepDefinitionResponseItem {
  id: string;
  handlerHash: string;
  stepCategory?: string;
  label?: string;
  description?: string;
  documentation?: StepDocMetadata;
  input?: SchemaProperty[];
  config?: SchemaProperty[];
  output?: SchemaProperty[];
}

interface StepDefinitionsResponse {
  steps: StepDefinitionResponseItem[];
}

/** Step row after the API has doc metadata (includes `stepCategory`). */
type StepDefinitionWithCategory = StepDefinitionResponseItem & { stepCategory: string };

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

function categoryPageBasename(stepCategory: string): string {
  const safe = stepCategory.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `step-definitions-category-${safe}.md`;
}

/**
 * Rewrites the auto-managed block in docs/reference/toc.yml so every generated
 * step-definitions-category-*.md page is listed under step-definitions-index.md.
 */
function replaceWorkflowStepDocsTocChildren(content: string, categories: string[]): string {
  const lines = content.split('\n');
  const beginIndex = lines.findIndex((l) => l.includes(WORKFLOW_STEP_TOC_BEGIN_SENTINEL));
  const endIndex = lines.findIndex((l) => l.includes(WORKFLOW_STEP_TOC_END_SENTINEL));
  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    throw new Error(
      `docs/reference/toc.yml must contain lines with "${WORKFLOW_STEP_TOC_BEGIN_SENTINEL}" and "${WORKFLOW_STEP_TOC_END_SENTINEL}" wrapping workflow step category entries (run from repo root).`
    );
  }
  const childLines = categories.map((c) => `      - file: workflows/${categoryPageBasename(c)}`);
  return [...lines.slice(0, beginIndex + 1), ...childLines, ...lines.slice(endIndex)].join('\n');
}

async function syncWorkflowStepDocsToc(
  categories: string[],
  log: { info: (msg: string) => void }
): Promise<void> {
  const current = await Fsp.readFile(REFERENCE_TOC_FILE, 'utf8');
  const next = replaceWorkflowStepDocsTocChildren(current, categories);
  if (next !== current) {
    await Fsp.writeFile(REFERENCE_TOC_FILE, next, 'utf8');
    log.info(`Updated ${Path.relative(REPO_ROOT, REFERENCE_TOC_FILE)}`);
  }
}

function categoryDisplayTitle(stepCategory: string): string {
  return CATEGORY_PAGE_TITLE[stepCategory] ?? stepCategory;
}

function compareStepCategories(a: string, b: string): number {
  const indexA = STEP_CATEGORY_SORT_ORDER.indexOf(a);
  const indexB = STEP_CATEGORY_SORT_ORDER.indexOf(b);
  const rankA = indexA === -1 ? STEP_CATEGORY_SORT_ORDER.length : indexA;
  const rankB = indexB === -1 ? STEP_CATEGORY_SORT_ORDER.length : indexB;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return a.localeCompare(b, 'en');
}

async function fetchStepDefinitions(
  url: string,
  authHeader: string
): Promise<StepDefinitionsResponse> {
  const fullUrl = `${url.replace(/\/$/, '')}${STEP_DEFINITIONS_PATH}`;
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
      `GET ${fullUrl} failed: ${response.status} ${response.statusText}. Ensure Kibana is running and a page that loads the workflows app has been opened so step doc metadata is pushed.`
    );
  }

  const body = (await response.json()) as unknown;
  if (typeof body !== 'object' || body === null || !('steps' in body)) {
    throw new Error(`Unexpected response shape: expected { steps: [...] }`);
  }
  const steps = (body as { steps: unknown }).steps;
  if (!Array.isArray(steps)) {
    throw new Error(`Response "steps" must be an array`);
  }
  return { steps: steps as StepDefinitionResponseItem[] };
}

/**
 * Strip one leading markdown heading line from details and demote all other headings by one level,
 * so they nest correctly under our "## ${label}" section (e.g. ## in details becomes ###).
 */
function normalizeDetailsHeadings(details: string): string {
  const trimmed = details.trimStart();
  const firstLineMatch = trimmed.match(/^#+\s+.+$/m);
  let body: string;
  if (firstLineMatch) {
    const newlineIndex = trimmed.indexOf('\n');
    if (newlineIndex >= 0) {
      body = trimmed.slice(newlineIndex + 1).trimStart();
    } else {
      body = '';
    }
  } else {
    body = trimmed;
  }
  // Demote every remaining heading by one level (## -> ###, ### -> ####; max 6 #).
  return body.replace(/^(#+)(\s)/gm, (_, hashes, space) =>
    hashes.length >= 6 ? hashes + space : hashes + '#' + space
  );
}

/**
 * Remove the "Configuration" subsection from details when we render our own Configuration table,
 * so we don't show both the table and the prose block (e.g. "arrays (required): ...").
 */
function stripConfigurationSection(details: string): string {
  const configHeading = /^#{2,6}\s+Configuration\s*$/m;
  const match = details.match(configHeading);
  if (!match || match.index === undefined) {
    return details;
  }
  const start = match.index;
  const afterHeading = details.slice(start + match[0].length);
  const nextHeading = afterHeading.match(/\n(#{2,6}\s+)/m);
  const endOfSection =
    nextHeading && nextHeading.index !== undefined
      ? start + match[0].length + nextHeading.index
      : details.length;
  const before = details.slice(0, start).trimEnd();
  const after = details.slice(endOfSection).trimStart();
  return [before, after].filter(Boolean).join('\n\n');
}

function renderPropertyTable(properties: SchemaProperty[], title: string): string[] {
  const hasDescriptions = properties.some((p) => p.description);
  const header = hasDescriptions
    ? '| Property | Type | Required | Description |'
    : '| Property | Type | Required |';
  const separator = hasDescriptions ? '| --- | --- | --- | --- |' : '| --- | --- | --- |';
  const lines: string[] = [`### ${title}`, '', header, separator];
  for (const p of properties) {
    const required = p.required ? 'Yes' : 'Optional';
    const desc = p.description ?? '';
    if (hasDescriptions) {
      lines.push(`| \`${p.name}\` | ${p.type} | ${required} | ${desc} |`);
    } else {
      lines.push(`| \`${p.name}\` | ${p.type} | ${required} |`);
    }
  }
  lines.push('');
  return lines;
}

function renderStepSection(step: StepDefinitionResponseItem): string {
  const label = step.label ?? step.id;
  const description = step.description ?? '';
  const rawDetails = step.documentation?.details ?? description;
  let details = normalizeDetailsHeadings(rawDetails);
  if (step.config !== undefined && step.config.length > 0) {
    details = stripConfigurationSection(details);
  }
  // Only render examples explicitly declared on the step definition (`documentation.examples`).
  const examples = step.documentation?.examples ?? [];

  const lines: string[] = [`## ${label}`, '', details, ''];

  if (step.input !== undefined && step.input.length > 0) {
    lines.push(...renderPropertyTable(step.input, 'Input'));
  }

  if (step.config !== undefined && step.config.length > 0) {
    lines.push(...renderPropertyTable(step.config, 'Configuration'));
  }

  if (step.output !== undefined && step.output.length > 0) {
    lines.push(...renderPropertyTable(step.output, 'Output'));
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

function sortSteps<T extends StepDefinitionResponseItem>(steps: T[]): T[] {
  return [...steps].sort((a, b) => {
    const labelA = a.label ?? a.id;
    const labelB = b.label ?? b.id;
    const byLabel = labelA.localeCompare(labelB, 'en');
    return byLabel !== 0 ? byLabel : a.id.localeCompare(b.id, 'en');
  });
}

function renderIndexDocument(sorted: StepDefinitionWithCategory[], categories: string[]): string {
  const header = '<!-- To regenerate, run: node scripts/generate workflow-step-docs -->';
  const intro =
    'Workflow steps are the building blocks of a workflow. Use the category pages for full reference content.';

  const bulletLines = sorted.map((s) => {
    const label = s.label ?? s.id;
    const desc = s.description ?? 'No description.';
    const catTitle = categoryDisplayTitle(s.stepCategory);
    const catFile = categoryPageBasename(s.stepCategory);
    return `- **${label}** (\`${s.id}\`, ${catTitle}): ${desc} — [${catTitle} steps](${catFile})`;
  });

  const categoryLinks = categories.map((c) => {
    const title = categoryDisplayTitle(c);
    const count = sorted.filter((s) => s.stepCategory === c).length;
    const file = categoryPageBasename(c);
    return `- [${title}](${file}) (${count} step${count === 1 ? '' : 's'})`;
  });

  return [
    header,
    '',
    '# Workflow steps',
    '',
    intro,
    '',
    '## Browse by category',
    '',
    ...categoryLinks,
    '',
    '## All steps',
    '',
    ...bulletLines,
    '',
  ].join('\n');
}

function renderCategoryDocument(
  stepCategory: string,
  stepsInCategory: StepDefinitionWithCategory[]
): string {
  const header = '<!-- To regenerate, run: node scripts/generate workflow-step-docs -->';
  const title = categoryDisplayTitle(stepCategory);
  const intro = `Step types in the **${title}** category (\`${stepCategory}\`).`;
  const sections = sortSteps(stepsInCategory).map(renderStepSection);

  return [header, '', `# ${title} workflow steps`, '', intro, '', ...sections].join('\n');
}

export const WorkflowStepDocsCommand: GenerateCommand = {
  name: 'workflow-step-docs',
  description:
    'Generate workflow step definitions doc. Requires Kibana running and the workflows app to have been loaded at least once so step doc metadata is pushed.',
  usage: 'node scripts/generate workflow-step-docs',
  async run({ log }) {
    const url = getKibanaUrl();
    const auth = getKibanaAuth();
    const authHeader = getAuthHeader(auth);

    log.info(`Fetching step definitions from ${url}${STEP_DEFINITIONS_PATH} ...`);
    const { steps } = await fetchStepDefinitions(url, authHeader);
    log.info(`Got ${steps.length} step(s).`);

    for (const step of steps) {
      if (typeof step.stepCategory !== 'string' || step.stepCategory.length === 0) {
        throw new Error(
          `Step "${step.id}" is missing stepCategory in the API response. Open a page that loads the workflows app so step doc metadata (including category) is pushed, then retry.`
        );
      }
    }

    const stepsWithCategory = steps as StepDefinitionWithCategory[];

    const sorted = sortSteps(stepsWithCategory);
    const categories = [...new Set(stepsWithCategory.map((s) => s.stepCategory))].sort(
      compareStepCategories
    );

    const indexMarkdown = renderIndexDocument(sorted, categories);
    const expectedCategoryFiles = new Set<string>();

    await Fsp.mkdir(SNIPPETS_DIR, { recursive: true });

    try {
      await Fsp.unlink(LEGACY_STEP_LIST_FILE);
      log.info(`Removed legacy ${Path.relative(REPO_ROOT, LEGACY_STEP_LIST_FILE)}`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    for (const category of categories) {
      const stepsInCategory = stepsWithCategory.filter((s) => s.stepCategory === category);
      const basename = categoryPageBasename(category);
      expectedCategoryFiles.add(basename);
      const outPath = Path.join(SNIPPETS_DIR, basename);
      await Fsp.writeFile(outPath, renderCategoryDocument(category, stepsInCategory), 'utf8');
      log.info(`Wrote ${Path.relative(REPO_ROOT, outPath)}`);
    }

    const entries = await Fsp.readdir(SNIPPETS_DIR, { withFileTypes: true });
    const staleCategorySnippets = entries.filter(
      (ent) =>
        ent.isFile() &&
        ent.name.startsWith('step-definitions-category-') &&
        ent.name.endsWith('.md') &&
        !expectedCategoryFiles.has(ent.name)
    );
    for (const ent of staleCategorySnippets) {
      await Fsp.unlink(Path.join(SNIPPETS_DIR, ent.name));
      log.info(`Removed stale snippet ${ent.name}`);
    }

    await Fsp.writeFile(STEP_INDEX_FILE, indexMarkdown, 'utf8');
    log.success(`Wrote ${Path.relative(REPO_ROOT, STEP_INDEX_FILE)}`);

    await syncWorkflowStepDocsToc(categories, log);
  },
};
