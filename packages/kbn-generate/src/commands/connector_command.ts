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

import type { GenerateCommand } from '../generate_command';
import { ask } from '../lib/ask';

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
  async run({ log, flags }) {
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

    const connectorId =
      (flags.id as string | undefined) ||
      ((await ask({
        question: `Connector id (must start with ".")`,
        async validate(input) {
          if (typeof input === 'string' && input.startsWith('.')) {
            return input;
          }
          return { err: 'id must start with a dot' };
        },
      })) as string) ||
      `.${connectorName}`;
    if (typeof connectorId !== 'string' || !connectorId.startsWith('.')) {
      throw createFlagError(`expected --id to start with "." (e.g. ".${connectorName}")`);
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

    // write spec index.ts
    const specIndexPath = Path.resolve(connectorDir, 'index.ts');
    const specIndexContent = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

export const ${connectorName
      .replace(/[-_](\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^\w/, (c) => c.toUpperCase())}: ConnectorSpec = {
  metadata: {
    id: '${connectorId}',
    displayName: '${connectorName.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}',
    description: '',
    minimumLicense: 'basic',
    supportedFeatureIds: ['workflows'],
  },
  schema: z.object({}),
  actions: {},
  test: {
    handler: async () => ({ ok: true }),
  },
};
`;
    await Fsp.writeFile(specIndexPath, specIndexContent);
    log.info('Wrote', Path.relative(REPO_ROOT, specIndexPath));

    // write icon component placeholder
    const iconIndexPath = Path.resolve(iconDir, 'index.tsx');
    const iconIndexContent = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';

export default (props: ConnectorIconProps) => {
  // Placeholder icon: use built-in EUI icon until a custom one is added
  return <EuiIcon type="globe" {...props} />;
};
`;
    await Fsp.writeFile(iconIndexPath, iconIndexContent);
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

    // append to CODEOWNERS: insert right after the latest rule that mentions "kbn-connector-specs"
    {
      let content = await Fsp.readFile(CODEOWNERS_FILE, 'utf8');
      const line = `/src/platform/packages/shared/kbn-connector-specs/src/specs/${connectorName}/** ${owner}`;
      if (content.includes(line)) {
        log.info('CODEOWNERS already has rule for', connectorName);
      } else {
        // Try to insert after the last rule that contains "kbn-connector-specs" in the path
        const lines = content.split('\n');
        let lastIdx = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          const l = lines[i];
          // check if this is a rule line (not a comment) and mentions kbn-connector-specs
          if (l && !l.trim().startsWith('#') && l.includes('kbn-connector-specs')) {
            lastIdx = i;
            break;
          }
        }

        if (lastIdx !== -1) {
          // insert directly below the last matching rule
          lines.splice(lastIdx + 1, 0, line);
          content = lines.join('\n');
        } else {
          // fallback: after GENERATED_END marker, but before ultimate priority comment if present
          const genEndIdx = content.indexOf(GENERATED_END);
          const ultIdx = content.indexOf(ULTIMATE_PRIORITY_RULES_COMMENT);
          if (genEndIdx !== -1) {
            const prefix = content.slice(0, genEndIdx + GENERATED_END.length);
            const middle = content.slice(
              genEndIdx + GENERATED_END.length,
              ultIdx === -1 ? undefined : ultIdx
            );
            const suffix = ultIdx === -1 ? '' : content.slice(ultIdx);
            const middleUpdated = (middle.endsWith('\n') ? middle : middle + '\n') + line + '\n';
            content = prefix + middleUpdated + suffix;
          } else {
            // final fallback: append at end
            content = content.trimEnd() + '\n' + line + '\n';
          }
        }

        await Fsp.writeFile(CODEOWNERS_FILE, content);
        log.info('Updated', Path.relative(REPO_ROOT, CODEOWNERS_FILE));
      }
    }

    log.success(`Connector scaffolded at ${Path.relative(REPO_ROOT, connectorDir)}`);
  },
};
