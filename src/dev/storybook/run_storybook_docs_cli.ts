/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { buildStorybookDocsArtifacts, runStorybookDocsTestServer } from '@kbn/storybook';
import { storybookAliases } from './aliases';

run(
  async ({ flagsReader, log }) => {
    const [alias] = flagsReader.getPositionals();

    if (!alias) {
      throw createFlagError('Missing alias');
    }

    if (!Object.hasOwn(storybookAliases, alias)) {
      throw createFlagError(`Unknown alias [${alias}]`);
    }

    const dist = flagsReader.boolean('dist');
    const build = flagsReader.boolean('build');
    const dev = flagsReader.boolean('dev');

    if ([dist, build, dev].filter(Boolean).length !== 1) {
      throw createFlagError('Pass exactly one of --dist, --build, or --dev');
    }

    const port = flagsReader.number('port') ?? 6007;
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw createFlagError('Expected --port to be a valid port');
    }

    const configDir = storybookAliases[alias as keyof typeof storybookAliases];
    const baseUrl = flagsReader.string('base-url') ?? `http://127.0.0.1:${port}`;
    const skipStorybookBuild = flagsReader.boolean('skip-storybook-build');
    const includeAllStories = flagsReader.boolean('include-all-stories');

    if (dev) {
      const serveDocs = flagsReader.boolean('docs');
      const docsPath = flagsReader.string('docs-path');
      const docsPort = flagsReader.number('docs-port');
      if (
        docsPort !== undefined &&
        (!Number.isInteger(docsPort) || docsPort <= 0 || docsPort > 65535)
      ) {
        throw createFlagError('Expected --docs-port to be a valid port');
      }

      await runStorybookDocsTestServer({
        alias,
        configDir,
        port,
        baseUrl,
        skipStorybookBuild,
        includeAllStories,
        watch: true,
        rebuildStorybook: flagsReader.boolean('rebuild-storybook'),
        serveDocs,
        docsPath,
        docsPort,
        log,
      });
      return;
    }

    const { archive, assetDir, registryUrl, manifest } = await buildStorybookDocsArtifacts({
      alias,
      configDir,
      baseUrl,
      skipStorybookBuild,
      includeAllStories,
      writeArchive: dist,
      log,
    });

    log.info(`Docs asset directory: ${assetDir}`);
    log.info(`Docs registry: ${registryUrl}`);
    if (archive) {
      log.info(`Docs archive: ${archive.outputPath}`);
      log.info(`Docs archive integrity: ${archive.integrity}`);
      log.info(`Storybook sources manifest snippet:
sources:
  kibana:
    artifact: ${archive.outputPath}
    integrity: ${archive.integrity}`);
    }
    log.info(`Embeddable stories: ${manifest.stories.length}`);
  },
  {
    usage: `node scripts/storybook_docs <alias> (--dist | --build | --dev)`,
    description: `
      Build Storybook docs artifacts for an alias.

      Available aliases:
        ${Object.keys(storybookAliases)
          .map((alias) => `📕 ${alias}`)
          .join('\n        ')}
    `,
    flags: {
      string: ['base-url', 'port', 'docs-path', 'docs-port'],
      boolean: [
        'dist',
        'build',
        'dev',
        'docs',
        'include-all-stories',
        'skip-storybook-build',
        'rebuild-storybook',
      ],
      default: {
        docs: true,
      },
      help: `
      --dist             Build docs registry, inline assets, and a tarball.
      --build            Build docs registry and inline assets without a tarball.
      --dev              Serve built_assets with CORS, watch story sources, and start docs-builder.
                         Reuses an existing static Storybook build; the watcher recompiles the
                         inline registry bundle on story-code edits (restart to pick up added/removed stories).
      --base-url         Base URL written into docs_registry.json. Defaults to http://127.0.0.1:<port>.
      --port             Local docs asset server port for --dev. Defaults to 6007.
      --docs             With --dev, also start docs-builder for a colocated docset.yml (default: true). Use --no-docs to disable.
      --docs-path        With --dev, serve a specific docset directory with docs-builder instead of auto-detecting.
      --docs-port        Port for docs-builder serve. Defaults to docs-builder's own default (3000).
      --include-all-stories
                         Include untagged stories in the generated docs registry.
      --skip-storybook-build
                         Reuse the existing static Storybook build (never rebuild, even if missing).
      --rebuild-storybook
                         With --dev, force a fresh static Storybook build even if one exists.
    `,
    },
  }
);
