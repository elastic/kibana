#!/usr/bin/env node
/**
 * PoC: Generate LLM-based translations for the Discover plugin.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate_discover_es_translation.mjs --locale es
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate_discover_es_translation.mjs --locale ru
 *
 * Output:
 *   x-pack/platform/plugins/private/translations/translations/{locale}.json
 *
 * NOTE: The pure functions (computeDelta, extractMessagesFromContent, findMissingPlaceholders)
 * are tested in: src/dev/i18n_tools/es_translation_utils.test.ts
 * Keep them in sync if you change the logic here.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIBANA_ROOT = path.resolve(__dirname, '..');
const TRANSLATIONS_DIR = path.join(
  KIBANA_ROOT,
  'x-pack/platform/plugins/private/translations/translations'
);

// All packages/plugins that contribute visible strings to the Discover app page.
// Keeping this explicit so adding a new package is a conscious decision.
const DISCOVER_SOURCE_DIRS = [
  'src/platform/plugins/shared/discover',
  'src/platform/packages/shared/kbn-unified-field-list',
  'src/platform/packages/shared/kbn-unified-data-table',
  'src/platform/packages/shared/kbn-unified-histogram',
  'src/platform/packages/shared/kbn-unified-tabs',
  'src/platform/packages/shared/kbn-unified-doc-viewer',
  'src/platform/plugins/shared/unified_search',
  'src/platform/plugins/shared/unified_doc_viewer',
  'src/platform/plugins/shared/data',
  'src/platform/plugins/shared/data_views',
  'src/platform/plugins/shared/saved_search',
  'src/platform/packages/shared/shared-ux/datetime/kbn-date-range-picker',
].map((p) => path.join(KIBANA_ROOT, p));

const BATCH_SIZE = 100;
const MODEL = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// Locale config
// ---------------------------------------------------------------------------

const LOCALE_CONFIGS = {
  es: {
    name: 'Spanish',
    systemPrompt: `You are a professional technical translator specializing in software UI strings for Kibana, an Elastic data analytics platform.

Translate the provided JSON object of UI strings from English to Spanish (es).

Rules:
1. Preserve ALL ICU placeholders exactly: {variableName}, {count, plural, one {item} other {items}}, {name, select, ...}
2. Preserve HTML tags and markdown syntax unchanged.
3. Keep product names untranslated: Kibana, Elasticsearch, Elastic, Discover, Lens, Canvas, etc.
4. Keep technical terms in English when they have no natural Spanish equivalent (e.g. "dashboard", "query", "index", "aggregation").
5. Use formal "usted" register — this is enterprise software.
6. For short ambiguous strings (e.g. "Edit", "Delete", "New") where the UI context is unclear, translate as verb in infinitive form.

Output a JSON object with the same keys. Each value must be an object:
  { "t": "<Spanish translation>", "f": false }

If you are uncertain (ambiguous string, no context, unclear technical term), set "f": true and include "why": "<brief reason>".

Example input:  { "discover.searchBar.placeholder": "Search...", "discover.noResults.title": "No results" }
Example output: { "discover.searchBar.placeholder": { "t": "Buscar...", "f": false }, "discover.noResults.title": { "t": "Sin resultados", "f": false } }

Respond with ONLY the JSON object, no explanation.`,
  },

  'ru-RU': {
    name: 'Russian',
    systemPrompt: `You are a professional technical translator specializing in software UI strings for Kibana, an Elastic data analytics platform.

Translate the provided JSON object of UI strings from English to Russian (ru).

Rules:
1. Preserve ALL ICU placeholders exactly: {variableName}, {count, plural, one {item} few {items} many {items} other {items}}, {name, select, ...}
   CRITICAL for Russian plurals: Russian requires three plural forms in ICU — "one" (1, 21, 31...), "few" (2-4, 22-24...), "many" (5-20, 25-30...). Always emit all three when translating plural strings.
2. Preserve HTML tags and markdown syntax unchanged.
3. Keep product names untranslated: Kibana, Elasticsearch, Elastic, Discover, Lens, Canvas, etc.
4. Keep technical terms in English when they have an established English usage in Russian IT context (e.g. "dashboard", "query", "index"). Use Russian equivalents where natural (e.g. "aggregation" → "агрегация", "field" → "поле/поля/полей" — ALWAYS translate "field", never leave it in English).
5. Use formal "вы" register — this is enterprise software. Do not use "ты".
6. Apply correct grammatical gender agreement. When translating button labels or short actions, use the appropriate grammatical form (imperative for actions, nominative for nouns).
7. For short ambiguous strings (e.g. "Edit", "Delete", "New") where UI context is unclear, use the imperative form and flag it.

Output a JSON object with the same keys. Each value must be an object:
  { "t": "<Russian translation>", "f": false }

If you are uncertain (ambiguous string, gender agreement unclear, technical term debatable), set "f": true and include "why": "<brief reason in English>".

Example input:  { "discover.searchBar.placeholder": "Search...", "discover.noResults.title": "No results" }
Example output: { "discover.searchBar.placeholder": { "t": "Поиск...", "f": false }, "discover.noResults.title": { "t": "Нет результатов", "f": false } }

Respond with ONLY the JSON object, no explanation.`,
  },
};

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

function walkDir(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function extractMessages(dir) {
  const messages = {};
  const files = walkDir(dir, ['.tsx', '.ts']).filter(
    (f) =>
      !f.includes('/test/') &&
      !f.includes('.test.') &&
      !f.includes('.spec.') &&
      !f.includes('mock') &&
      !f.includes('storybook') &&
      !f.includes('/target/')
  );

  const pattern =
    /i18n\.translate\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*?defaultMessage\s*:\s*'((?:[^'\\]|\\.)*)'/gs;
  const patternDouble =
    /i18n\.translate\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*?defaultMessage\s*:\s*"((?:[^"\\]|\\.)*)"/gs;
  // Also capture JSX <FormattedMessage id="..." defaultMessage="..." /> usage
  const fmDouble =
    /<FormattedMessage\s[^>]*id="([^"]+)"[^>]*defaultMessage="((?:[^"\\]|\\.)*)"/gs;
  const fmSingle =
    /<FormattedMessage\s[^>]*id='([^']+)'[^>]*defaultMessage='((?:[^'\\]|\\.)*)'/gs;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const [regex, sq] of [
      [pattern, true],
      [patternDouble, false],
      [fmDouble, false],
      [fmSingle, true],
    ]) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        const value = sq
          ? match[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
          : match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        if (!messages[key]) messages[key] = value;
      }
    }
  }
  return messages;
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

function computeDelta(sourceMessages, existingTranslations, sourceFingerprints) {
  const existing = existingTranslations.messages ?? {};
  const delta = {};
  const removed = [];

  for (const [key, englishText] of Object.entries(sourceMessages)) {
    const alreadyTranslated = key in existing;
    const sourceChanged = sourceFingerprints[key] !== englishText;
    if (!alreadyTranslated || sourceChanged) delta[key] = englishText;
  }

  for (const key of Object.keys(existing)) {
    if (!(key in sourceMessages)) removed.push(key);
  }

  return { delta, removed };
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

async function translateBatch(client, batch, systemPrompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: JSON.stringify(batch) }],
    system: systemPrompt,
  });

  const raw = response.content[0].text.trim();
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(json);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const localeArg = process.argv.find((a) => a.startsWith('--locale='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--locale') + 1];

  if (!localeArg || !LOCALE_CONFIGS[localeArg]) {
    console.error(
      `Error: --locale is required. Supported: ${Object.keys(LOCALE_CONFIGS).join(', ')}`
    );
    process.exit(1);
  }

  const { name, systemPrompt } = LOCALE_CONFIGS[localeArg];
  const outputFile = path.join(TRANSLATIONS_DIR, `${localeArg}.json`);
  const fingerprintFile = path.join(TRANSLATIONS_DIR, `${localeArg}.source.json`);
  const flaggedFile = path.join(TRANSLATIONS_DIR, `${localeArg}.flagged.json`);

  console.log(`Locale: ${localeArg} (${name})`);
  console.log(`Extracting i18n strings from ${DISCOVER_SOURCE_DIRS.length} source directories...`);
  const sourceMessages = {};
  for (const dir of DISCOVER_SOURCE_DIRS) {
    Object.assign(sourceMessages, extractMessages(dir));
  }
  console.log(`Found ${Object.keys(sourceMessages).length} strings in source.\n`);

  const existing = fs.existsSync(outputFile)
    ? JSON.parse(fs.readFileSync(outputFile, 'utf8'))
    : { messages: {} };

  const sourceFingerprints = fs.existsSync(fingerprintFile)
    ? JSON.parse(fs.readFileSync(fingerprintFile, 'utf8'))
    : {};

  const { delta, removed } = computeDelta(sourceMessages, existing, sourceFingerprints);
  const deltaKeys = Object.keys(delta);

  console.log(`Delta: ${deltaKeys.length} to translate, ${removed.length} to remove.\n`);

  if (deltaKeys.length === 0 && removed.length === 0) {
    console.log('All translations are up to date. Nothing to do.');
    process.exit(0);
  }

  const translations = { ...(existing.messages ?? {}) };
  for (const key of removed) {
    delete translations[key];
    delete sourceFingerprints[key];
    console.log(`  Removed: ${key}`);
  }

  const flagged = [];
  let batchNum = 0;

  for (let i = 0; i < deltaKeys.length; i += BATCH_SIZE) {
    batchNum++;
    const batchKeys = deltaKeys.slice(i, i + BATCH_SIZE);
    const batch = Object.fromEntries(batchKeys.map((k) => [k, delta[k]]));

    console.log(
      `Translating batch ${batchNum}/${Math.ceil(deltaKeys.length / BATCH_SIZE)} (${batchKeys.length} strings)...`
    );

    let result;
    try {
      result = await translateBatch(client, batch, systemPrompt);
    } catch (err) {
      console.error(`Batch ${batchNum} failed:`, err.message);
      for (const key of batchKeys) translations[key] = delta[key];
      continue;
    }

    for (const key of batchKeys) {
      const entry = result[key];
      if (!entry) {
        translations[key] = delta[key];
        flagged.push({ key, reason: 'missing from model response', english: delta[key] });
        continue;
      }
      translations[key] = entry.t;
      sourceFingerprints[key] = delta[key];
      if (entry.f) {
        flagged.push({
          key,
          reason: entry.why ?? 'flagged by model',
          english: delta[key],
          translation: entry.t,
        });
      }
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify({ locale: localeArg, formats: {}, messages: translations }, null, 2), 'utf8');
  console.log(`\nWrote ${Object.keys(translations).length} translations to:\n  ${outputFile}`);

  fs.writeFileSync(fingerprintFile, JSON.stringify(sourceFingerprints, null, 2), 'utf8');

  if (flagged.length > 0) {
    fs.writeFileSync(flaggedFile, JSON.stringify(flagged, null, 2), 'utf8');
    console.log(`\n${flagged.length} strings flagged for review:\n  ${flaggedFile}`);
  } else {
    if (fs.existsSync(flaggedFile)) fs.unlinkSync(flaggedFile);
    console.log('\nNo strings flagged for review.');
  }

  console.log(`\nSummary: +${deltaKeys.length} translated, -${removed.length} removed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
