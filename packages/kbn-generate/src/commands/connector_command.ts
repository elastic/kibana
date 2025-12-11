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

import type { GenerateCommand } from '../generate_command';
import { ask } from '../lib/ask';
import { CONNECTOR_TEMPLATE_DIR } from '../paths';

const CONNECTORS_ROOT = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-connector-specs/src/specs'
);

const ICONS_MAP_FILE = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts'
);

const ALL_SPECS_FILE = Path.resolve(
  REPO_ROOT,
  'src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts'
);

const CODEOWNERS_FILE = Path.resolve(REPO_ROOT, '.github/CODEOWNERS');
const ULTIMATE_PRIORITY_RULES_COMMENT = `
####
## These rules are always last so they take ultimate priority over everything else
####
`;
const GENERATED_END = `
####
## Everything below this line overrides the default assignments for each package.
## Items lower in the file have higher precedence:
##  https://help.github.com/articles/about-codeowners/
####
`;

export const ConnectorCommand: GenerateCommand = {
  name: 'connector',
  description: 'Scaffold a new connector spec folder and update exports, icons map, and CODEOWNERS',
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

    const connectorDir = Path.resolve(CONNECTORS_ROOT, connectorName);
    const iconDir = Path.resolve(connectorDir, 'icon');

    // create folder structure
    await Fsp.mkdir(iconDir, { recursive: true });

    // write spec index.ts via template
    const specIndexPath = Path.resolve(connectorDir, 'index.ts');
    await render.toFile(Path.resolve(CONNECTOR_TEMPLATE_DIR, 'index.ts.ejs'), specIndexPath, {
      connector: {
        name: connectorName,
        id: connectorId,
        displayName: connectorName.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        className: connectorName
          .replace(/[-_](\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
          .replace(/^\w/, (c) => c.toUpperCase()),
      },
    });
    log.info('Wrote', Path.relative(REPO_ROOT, specIndexPath));

    // write icon component placeholder via template
    const iconIndexPath = Path.resolve(iconDir, 'index.tsx');
    await render.toFile(Path.resolve(CONNECTOR_TEMPLATE_DIR, 'icon/index.tsx.ejs'), iconIndexPath, {
      connector: { name: connectorName },
    });
    log.info('Wrote', Path.relative(REPO_ROOT, iconIndexPath));

    // update connector_icons_map.ts
    {
      const content = await Fsp.readFile(ICONS_MAP_FILE, 'utf8');
      const entry = `  [
    '${connectorId}',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIcon${connectorName
            .replace(/(^\\w|[-_]\\w)/g, (m) => m.replace(/[-_]/, '').toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '')}" */ './specs/${connectorName}/icon'
        )
    ),
  ],`;
      if (content.includes(`'${connectorId}'`)) {
        log.info('Icon mapping already exists for', connectorId);
      } else {
        const insertPoint = content.lastIndexOf(']');
        const updated =
          content.slice(0, insertPoint) +
          (content[insertPoint - 1] === '[' ? '' : '\n') +
          entry +
          '\n' +
          content.slice(insertPoint);
        await Fsp.writeFile(ICONS_MAP_FILE, updated);
        log.info('Updated', Path.relative(REPO_ROOT, ICONS_MAP_FILE));
      }
    }

    // update all_specs.ts
    {
      const relExport = `export * from './specs/${connectorName}';`;
      const content = await Fsp.readFile(ALL_SPECS_FILE, 'utf8');
      if (!content.includes(relExport)) {
        const updated = content.trimEnd() + '\n' + relExport + '\n';
        await Fsp.writeFile(ALL_SPECS_FILE, updated);
        log.info('Updated', Path.relative(REPO_ROOT, ALL_SPECS_FILE));
      } else {
        log.info('Export already exists in', Path.relative(REPO_ROOT, ALL_SPECS_FILE));
      }
    }

    // append to CODEOWNERS: insert within the overrides section (below GENERATED_END)
    // Prefer placing after the last "kbn-connector-specs" rule in the overrides section
    {
      let content = await Fsp.readFile(CODEOWNERS_FILE, 'utf8');
      const line = `src/platform/packages/shared/kbn-connector-specs/src/specs/${connectorName}/** ${owner}`;
      if (content.includes(line)) {
        log.info('CODEOWNERS already has rule for', connectorName);
      } else {
        const genEndIdx = content.indexOf(GENERATED_END);
        const ultIdx = content.indexOf(ULTIMATE_PRIORITY_RULES_COMMENT);
        const prefix = genEndIdx !== -1 ? content.slice(0, genEndIdx + GENERATED_END.length) : '';
        const middle =
          genEndIdx !== -1
            ? content.slice(genEndIdx + GENERATED_END.length, ultIdx === -1 ? undefined : ultIdx)
            : content.slice(0, ultIdx === -1 ? undefined : ultIdx);
        const suffix = ultIdx === -1 ? '' : content.slice(ultIdx);

        const middleLines = middle.split('\n');
        let insertAt = -1;
        for (let i = middleLines.length - 1; i >= 0; i--) {
          const l = middleLines[i];
          if (l && !l.trim().startsWith('#') && l.includes('kbn-connector-specs')) {
            insertAt = i + 1;
            break;
          }
        }

        if (insertAt === -1) {
          // no existing kbn-connector-specs rule in overrides; add to top of overrides
          const updatedMiddle = (middle.endsWith('\n') ? middle : middle + '\n') + line + '\n';
          content = prefix + updatedMiddle + suffix;
        } else {
          middleLines.splice(insertAt, 0, line);
          content = prefix + middleLines.join('\n') + (middle.endsWith('\n') ? '' : '\n') + suffix;
        }

        await Fsp.writeFile(CODEOWNERS_FILE, content);
        log.info('Updated', Path.relative(REPO_ROOT, CODEOWNERS_FILE));
      }
    }

    // run eslint --fix on the generated connector folder and updated spec/icon maps
    {
      log.info('Linting generated connector files');
      const eslint = new ESLint({
        cache: false,
        cwd: REPO_ROOT,
        fix: true,
        extensions: ['.js', '.mjs', '.ts', '.tsx'],
      });
      await ESLint.outputFixes(
        await eslint.lintFiles([connectorDir, ICONS_MAP_FILE, ALL_SPECS_FILE])
      );
    }

    log.success(`Connector scaffolded at ${Path.relative(REPO_ROOT, connectorDir)}`);
  },
};
