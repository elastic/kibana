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
import { createFlagError } from '@kbn/dev-cli-errors';
import { ESLint } from 'eslint';
import { writeConnectorRegistries } from '@kbn/connector-specs/codegen';

import type { GenerateCommand } from '../generate_command';
import { ask } from '../lib/ask';
import { CONNECTOR_TEMPLATE_DIR } from '../paths';

const CONNECTORS_ROOT = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-connector-specs/src/specs'
);

const DOCS_DIR = Path.resolve(REPO_ROOT, 'docs/reference/connectors-kibana');
// `elastic-connectors-list.md` / `elastic-connectors.md` are reserved for the small, fixed set of
// Kibana-native connectors (Cases, Index, ServerLog, Obs AI Assistant). Every connector scaffolded
// by this generator is a third-party integration, so it belongs in the data-context-sources list/TOC
// section instead. See the `review-connector` skill for the full placement rule.
const SNIPPET_FILE = Path.resolve(DOCS_DIR, '_snippets/data-context-sources-connectors-list.md');
const TOC_FILE = Path.resolve(REPO_ROOT, 'docs/reference/toc.yml');
const TOC_SECTION_FILE = 'connectors-kibana/data-context-sources-connectors.md';

export const ConnectorCommand: GenerateCommand = {
  name: 'connector',
  description:
    'Scaffold a new connector spec folder with tests, docs, and update exports, icons map, snippets, TOC, and CODEOWNERS',
  usage:
    'node scripts/generate connector [connectorName] --id ".connector_id" --owner "@elastic/team-handle"',
  flags: {
    string: ['id', 'owner'],
    help: `
      --id      Connector id (must start with a dot), defaults to ".{connectorName}"
      --owner   GitHub team/handle to own the connector folder in CODEOWNERS (e.g., "@elastic/response-ops")
    `,
  },
  async run({ log, flags, render }) {
    const connectorName =
      (flags._[0] as string | undefined) ||
      ((await ask({
        question: 'Connector folder name (e.g. virustotal)',
        async validate(input) {
          if (typeof input === 'string' && input.length > 0 && !input.includes(' ')) {
            return input;
          }
          return { err: 'connector name must be non-empty and contain no spaces' };
        },
      })) as string);
    if (!connectorName || connectorName.includes(' ')) {
      throw createFlagError(`expected connectorName without spaces`);
    }

    const idPattern = /^\.[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
    const MAX_ID_LENGTH = 64;
    const connectorId =
      (flags.id as string | undefined) ||
      ((await ask({
        question: `Connector id (must start with ".", allowed: A-Z a-z 0-9 . _ -, max 64 chars)`,
        async validate(input) {
          if (typeof input === 'string' && input.length <= MAX_ID_LENGTH && idPattern.test(input)) {
            return input;
          }
          return {
            err: 'Invalid id. Must start with ".", contain only letters (A-Z/a-z), digits, dot, underscore, or hyphen, and be ≤ 64 chars.',
          };
        },
      })) as string) ||
      `.${connectorName}`;
    if (
      typeof connectorId !== 'string' ||
      !idPattern.test(connectorId) ||
      connectorId.length > MAX_ID_LENGTH
    ) {
      throw createFlagError(
        `expected --id like ".${connectorName.replace(
          /[^A-Za-z0-9._-]/g,
          ''
        )}" (start with ".", allowed: A-Z a-z 0-9 . _ -, max length 64)`
      );
    }

    const owner =
      (flags.owner as string | undefined) ||
      ((await ask({
        question:
          'GitHub owner for this connector (team/user), include "@" (e.g. "@elastic/response-ops")',
        async validate(input) {
          if (typeof input === 'string' && input.startsWith('@')) {
            return input;
          }
          return { err: 'owner must start with @' };
        },
      })) as string);
    if (typeof owner !== 'string' || !owner.startsWith('@')) {
      throw createFlagError(`expected --owner to be a string starting with an @ symbol`);
    }

    const pkgVersion = (
      JSON.parse(await Fsp.readFile(Path.resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
        version: string;
      }
    ).version;
    const previewVersion = pkgVersion.split('.').slice(0, 2).join('.');

    const connectorDir = Path.resolve(CONNECTORS_ROOT, connectorName);
    const kebabName = connectorName.replace(/_/g, '-');
    const iconDir = Path.resolve(connectorDir, 'icon');

    const displayName = connectorName.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    const className = connectorName
      .replace(/[-_](\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^\w/, (c) => c.toUpperCase());

    // create folder structure
    await Fsp.mkdir(iconDir, { recursive: true });

    // write spec <connector_name>.ts via template
    const specIndexPath = Path.resolve(connectorDir, `${connectorName}.ts`);
    await render.toFile(Path.resolve(CONNECTOR_TEMPLATE_DIR, 'index.ts.ejs'), specIndexPath, {
      connector: {
        name: connectorName,
        id: connectorId,
        displayName,
        className,
        owner,
      },
    });
    log.info('Wrote', Path.relative(REPO_ROOT, specIndexPath));

    // write a test file via template
    const testFilePath = Path.resolve(connectorDir, `${connectorName}.test.ts`);
    await render.toFile(
      Path.resolve(CONNECTOR_TEMPLATE_DIR, 'connector.test.ts.ejs'),
      testFilePath,
      {
        connector: {
          name: connectorName,
          className,
        },
      }
    );
    log.info('Wrote', Path.relative(REPO_ROOT, testFilePath));

    // write icon component placeholder via template
    const iconIndexPath = Path.resolve(iconDir, 'index.tsx');
    await render.toFile(Path.resolve(CONNECTOR_TEMPLATE_DIR, 'icon/index.tsx.ejs'), iconIndexPath, {
      connector: { name: connectorName },
    });
    log.info('Wrote', Path.relative(REPO_ROOT, iconIndexPath));

    // write documentation file via template
    const docsFilePath = Path.resolve(DOCS_DIR, `${kebabName}-action-type.md`);
    await render.toFile(Path.resolve(CONNECTOR_TEMPLATE_DIR, 'docs.md.ejs'), docsFilePath, {
      connector: {
        name: connectorName,
        displayName,
        kebabName,
        version: previewVersion,
      },
    });
    log.info('Wrote', Path.relative(REPO_ROOT, docsFilePath));

    // Regenerate connector_icons_map.ts, all_specs.ts, and the per-connector ownership block in
    // CODEOWNERS from src/specs/ (rather than hand-splicing an entry into each). All three are
    // generated and CI-checked precisely so that many connector PRs landing concurrently no
    // longer produce merge conflicts or misplaced entries on hand-maintained append points — the
    // freshly-scaffolded connector's spec/icon files (which already declare `OWNER` above) just
    // need to exist on disk beforehand; this call picks them up automatically. See
    // `@kbn/connector-specs/codegen` for details.
    const registryEntries = await writeConnectorRegistries();
    log.info(
      `Regenerated all_specs.ts, connector_icons_map.ts, and CODEOWNERS (${registryEntries.length} connectors)`
    );

    // update snippet file (data-context-sources-connectors-list.md)
    {
      const content = await Fsp.readFile(SNIPPET_FILE, 'utf8');
      const newEntry = `* [${displayName}](/reference/connectors-kibana/${kebabName}-action-type.md): TODO: Add brief description.`;

      if (content.includes(`${kebabName}-action-type.md`)) {
        log.info('Snippet file already references', kebabName);
      } else {
        // The file is split into categories with a "**Category**" header line (e.g.
        // "**Third-party search**", "**Identity management**") separated by blank lines. Insert
        // alphabetically within the FIRST category only, and never cross into the next category's
        // header — most scaffolded connectors are generic third-party integrations, and it's safer
        // to land a new entry at the end of the first section than to risk it being alphabetically
        // sorted into an unrelated category (e.g. "Threat intelligence"). Re-categorize manually if
        // needed. Blank lines are preserved verbatim (not filtered out) so category separators and
        // the file's exact formatting survive every generator run.
        const hadTrailingNewline = content.endsWith('\n');
        const rawLines = content.split('\n');
        if (hadTrailingNewline) {
          rawLines.pop();
        }
        const isCategoryHeader = (l: string) => /^\*\*.+\*\*$/.test(l.trim());
        const isListItem = (l: string) => l.trim().startsWith('*') && !isCategoryHeader(l);
        let inserted = false;
        let pastFirstCategory = false;
        let sawFirstCategoryItem = false;
        const newLines: string[] = [];
        // Blank lines between the first category's last item and the next category's header must
        // stay attached to that header (as its separator), not get displaced by an entry inserted
        // after them. Hold them back until we know what follows.
        let pendingBlankLines: string[] = [];

        for (const line of rawLines) {
          const isBlank = line.trim() === '';

          if (!inserted && isCategoryHeader(line) && sawFirstCategoryItem) {
            // Reached the end of the first category without finding an alphabetical spot: the new
            // entry belongs right after the last item, before the blank separator.
            newLines.push(newEntry, ...pendingBlankLines, line);
            pendingBlankLines = [];
            inserted = true;
            pastFirstCategory = true;
            continue;
          }

          if (!inserted && !pastFirstCategory && isListItem(line)) {
            newLines.push(...pendingBlankLines);
            pendingBlankLines = [];
            const match = line.match(/\[([^\]]+)\]/);
            if (match && match[1] > displayName) {
              newLines.push(newEntry, line);
              inserted = true;
            } else {
              if (match) {
                sawFirstCategoryItem = true;
              }
              newLines.push(line);
            }
            continue;
          }

          if (!inserted && !pastFirstCategory && isBlank) {
            pendingBlankLines.push(line);
            continue;
          }

          newLines.push(...pendingBlankLines, line);
          pendingBlankLines = [];
        }

        if (!inserted) {
          newLines.push(newEntry);
        }
        newLines.push(...pendingBlankLines);

        await Fsp.writeFile(SNIPPET_FILE, newLines.join('\n') + (hadTrailingNewline ? '\n' : ''));
        log.info('Updated', Path.relative(REPO_ROOT, SNIPPET_FILE));
      }
    }

    // update toc.yml (add to the data-context-sources-connectors section, alphabetically among
    // its existing children by doc slug — mirrors the snippet-file alphabetical insertion above.
    // Appending unconditionally here previously let entries drift out of order whenever connector
    // PRs landed concurrently (e.g. "posthog" ended up after "prometheus-alertmanager"), the same
    // failure mode the CODEOWNERS/all_specs.ts generation fixes addressed elsewhere in this package.
    {
      const content = await Fsp.readFile(TOC_FILE, 'utf8');
      const docEntry = `connectors-kibana/${kebabName}-action-type.md`;

      if (content.includes(docEntry)) {
        log.info('TOC already references', kebabName);
      } else {
        const lines = content.split('\n');
        const sectionIdx = lines.findIndex((l) => l.includes(`file: ${TOC_SECTION_FILE}`));

        if (sectionIdx === -1) {
          log.warning('Could not find data-context-sources-connectors section in TOC');
        } else {
          let childIndent = '';
          let insertAt = -1;
          let lastChildIdx = -1;

          for (let j = sectionIdx + 1; j < lines.length; j++) {
            const trimmed = lines[j].trim();
            const currentIndent = lines[j].match(/^(\s*)/)?.[1] || '';

            if (trimmed === 'children:') continue;

            if (!childIndent && trimmed.startsWith('- file:')) {
              childIndent = currentIndent;
            }

            if (!childIndent) continue;

            if (currentIndent.length < childIndent.length) {
              // We've outdented, meaning we left the children section
              break;
            }
            if (currentIndent !== childIndent || !trimmed.startsWith('- file:')) {
              continue;
            }

            lastChildIdx = j;
            if (insertAt === -1) {
              const existingSlug = trimmed.match(/connectors-kibana\/([^/]+)-action-type\.md/)?.[1];
              if (existingSlug && existingSlug > kebabName) {
                insertAt = j;
              }
            }
          }

          // No alphabetically later entry found: append after the last child.
          if (insertAt === -1 && lastChildIdx !== -1) {
            insertAt = lastChildIdx + 1;
          }

          if (insertAt !== -1) {
            lines.splice(insertAt, 0, `${childIndent}- file: ${docEntry}`);
            await Fsp.writeFile(TOC_FILE, lines.join('\n'));
            log.info('Updated', Path.relative(REPO_ROOT, TOC_FILE));
          } else {
            log.warning('Could not find appropriate location in TOC to insert connector doc');
          }
        }
      }
    }

    // run eslint --fix on the scaffolded connector folder. all_specs.ts and connector_icons_map.ts
    // are already prettier-formatted by the registry generator above and don't need linting.
    {
      log.info('Linting generated connector files');
      const eslint = new ESLint({
        cache: false,
        cwd: REPO_ROOT,
        fix: true,
        extensions: ['.js', '.mjs', '.ts', '.tsx'],
      });
      await ESLint.outputFixes(await eslint.lintFiles([connectorDir]));
    }

    log.success(`Connector scaffolded at ${Path.relative(REPO_ROOT, connectorDir)}`);
    log.success(`Documentation created at ${Path.relative(REPO_ROOT, docsFilePath)}`);
    log.info(`Remember to:`);
    log.info(`  - Update the connector description in ${Path.relative(REPO_ROOT, SNIPPET_FILE)}`);
    log.info(`  - Implement actions in ${Path.relative(REPO_ROOT, specIndexPath)}`);
    log.info(`  - Add tests for each action in ${Path.relative(REPO_ROOT, testFilePath)}`);
    log.info(`  - Complete the documentation in ${Path.relative(REPO_ROOT, docsFilePath)}`);
    log.info(`  - Add a custom icon in ${Path.relative(REPO_ROOT, iconDir)}`);
  },
};
