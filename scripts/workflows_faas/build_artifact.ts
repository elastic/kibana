/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { transformSync } from '@swc/core';
import { generate } from 'peggy';
import type { RemoteModule } from '@kbn/core-remote-common';
import { buildRemoteSpec } from '../../src/core/packages/remote/server-internal/src/build_remote_spec';
import { portableSpec, sha256 } from '../../src/core/packages/remote/server-internal/src/artifact_manifest';
import { workflowRemoteRegistration } from '../../src/platform/plugins/shared/workflows_execution_engine/server/remote/registration';

async function main(): Promise<void> {
  const load = createRequire(__filename);
  const root = process.cwd();
  const output = resolve(process.argv[2] ?? 'target/workflows_faas');
  const started = performance.now();
  const modules = globSync(['src/platform/plugins/**/server/remote/index.ts', 'x-pack/**/server/remote/index.ts'])
    .sort().map((entry) => (load(resolve(entry)) as { remoteModule: RemoteModule }).remoteModule);
  const spec = buildRemoteSpec(modules, workflowRemoteRegistration);
  const portable = portableSpec(spec);
  const references = [spec.root, ...(spec.catalog ? [spec.catalog] : []), ...spec.executorProviders, ...spec.contributions];
  const portableReferences = references.map((ref) => portableSpec({ ...spec, root: { ...spec.root, ...ref } }).root);
  const imports = references.map((ref, index) => `import * as m${index} from ${JSON.stringify(ref.modulePath)};`).join('\n');
  const table = portableReferences.map((ref, index) => `${JSON.stringify(ref.modulePath)}: m${index}`).join(',\n');
  mkdirSync(output, { recursive: true });
  const result = await build({
    stdin: {
      contents: `${imports}\nimport { createHandler } from ${JSON.stringify(join(root, 'src/core/packages/remote/server-internal/faas/handler.ts'))};\nconst modules = {${table}};\nexport const handler = createHandler((path, name, loaded) => { loaded.push(path); if (!modules[path]?.[name]) throw new Error('Undeclared executor export: ' + path + ':' + name); return modules[path][name]; });`,
      resolveDir: root, loader: 'ts',
    },
    outfile: join(output, 'handler.cjs'), bundle: true, platform: 'node', target: 'node24',
    format: 'cjs', metafile: true, tsconfig: join(root, 'tsconfig.json'),
    plugins: [{
      name: 'kibana-decorators',
      setup(builder) {
        builder.onLoad({ filter: /\.peggy$/ }, (args) => ({
          contents: generate(readFileSync(args.path, 'utf8'), {
            ...JSON.parse(readFileSync(`${args.path}.config.json`, 'utf8')), output: 'source', format: 'commonjs',
          }), loader: 'js',
        }));
        builder.onLoad({ filter: /\.tsx?$/ }, (args) => ({
          contents: transformSync(readFileSync(args.path, 'utf8'), {
            filename: args.path,
            jsc: { parser: { syntax: 'typescript', tsx: args.path.endsWith('.tsx'), decorators: true },
              transform: { legacyDecorator: true, decoratorMetadata: true }, target: 'es2022' },
            module: { type: 'es6' },
          }).code,
          loader: 'js', resolveDir: resolve(args.path, '..'),
        }));
      },
    }],
  });
  const inputs = Object.keys(result.metafile.inputs).sort();
  const emitted = new Set(Object.values(result.metafile.outputs).flatMap((value) => Object.entries(value.inputs).filter(([, data]) => data.bytesInOutput > 0).map(([path]) => path)));
  const forbidden = inputs.filter((path) => emitted.has(path) && /\/server\/(plugin|workflow_storage|workflow_log|cases_operations|alert_graph_es)\.[tj]s$/.test(path));
  if (forbidden.length) throw new Error(`Coordinator/plugin implementation entered executor closure: ${forbidden.join(', ')}`);
  const content = {
    version: 1 as const,
    files: { 'handler.cjs': sha256(readFileSync(join(output, 'handler.cjs'))) },
    spec: portable,
  };
  const manifest = { ...content, artifactHash: sha256(JSON.stringify(content)) };
  writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(output, 'inventory.json'), JSON.stringify({
    inputs: inputs.map((path) => ({ path, emitted: emitted.has(path), ...result.metafile.inputs[path] })),
    outputs: result.metafile.outputs,
    buildMs: performance.now() - started,
    artifactBytes: readFileSync(join(output, 'handler.cjs')).byteLength,
    buildNode: process.version,
  }, null, 2));
  writeFileSync(join(output, 'Dockerfile'), `ARG RUNTIME_IMAGE=public.ecr.aws/lambda/nodejs:24\nFROM \${RUNTIME_IMAGE}\nCOPY handler.cjs manifest.json \${LAMBDA_TASK_ROOT}/\nRUN node -e "require(\'./handler.cjs\')"\nCMD ["handler.handler"]\n`);
  console.log(JSON.stringify({ output: relative(root, output), artifactHash: manifest.artifactHash, buildMs: performance.now() - started }));

}
main().catch((error: Error) => { console.error(error); process.exitCode = 1; });
