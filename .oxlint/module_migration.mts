/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DummyRule } from 'oxlint';
import styledComponentsFiles from '@kbn/babel-preset/styled_components_files.js';

const { USES_STYLED_COMPONENTS } = styledComponentsFiles;

const USES_ELASTIC_APM_AGENT = [
  // Core platform APM integration & agent infrastructure
  /src[\/\\]core[\/\\]/,
  /kbn-apm-config-loader[\/\\]/,
  /kbn-apm-utils[\/\\]/,

  // Test & dev tooling
  /kbn-test[\/\\]src[\/\\]/,
  /kbn-journeys[\/\\]/,
  /kbn-cli-dev-mode[\/\\]/,
  /kbn-docs-utils[\/\\]/,
  /src[\/\\]platform[\/\\]test[\/\\]/,
  /x-pack[\/\\]platform[\/\\]test[\/\\]/,

  // Shared packages with APM tracing
  /kbn-langchain[\/\\]server[\/\\]tracers[\/\\]/,
  /kbn-reporting[\/\\]export_types[\/\\]/,

  // Plugins with legacy APM custom spans (pending OTel migration)
  /workflows_execution_engine[\/\\]server[\/\\]/,
  /task_manager[\/\\]server[\/\\]/,
  /fleet[\/\\]server[\/\\]/,
  /alerting[\/\\]server[\/\\]/,
  /screenshotting[\/\\]server[\/\\]/,
  /reporting[\/\\]server[\/\\]/,
  /intercepts[\/\\]server[\/\\]/,
  /data_usage[\/\\]server[\/\\]/,
  /encrypted_saved_objects[\/\\]server[\/\\]/,
  /plugins[\/\\]shared[\/\\]data[\/\\]server[\/\\]search[\/\\]/,
  /telemetry[\/\\]server[\/\\]/,
  /telemetry_collection_manager[\/\\]server[\/\\]/,
  /security_solution[\/\\]server[\/\\]/,
  /lists[\/\\]server[\/\\]/,
  /elastic_assistant[\/\\]server[\/\\]/,
  /plugins[\/\\]apm[\/\\]/,
  /synthetics[\/\\]server[\/\\]/,
  /feature-flags[\/\\]server-internal[\/\\]/,
  /plugins[\/\\]slo[\/\\]server[\/\\]/,
];

/** Rule options must be JSON; the rule rebuilds each `{ source, flags }` pair into a RegExp. */
const toPatterns = (patterns: readonly RegExp[]) =>
  patterns.map(({ source, flags }) => ({ source, flags }));

export const moduleMigrationRule: DummyRule = [
  'error',
  [
    {
      from: 'expect.js',
      to: '@kbn/expect',
    },
    {
      from: 'mkdirp',
      to: false,
      disallowedMessage: `Don't use 'mkdirp', use the new { recursive: true } option of Fs.mkdir instead`,
    },
    {
      from: 'numeral',
      to: '@elastic/numeral',
    },
    {
      from: '@kbn/elastic-idx',
      to: false,
      disallowedMessage: `Don't use idx(), use optional chaining syntax instead https://ela.st/optchain`,
    },
    {
      from: 'x-pack',
      toRelative: 'x-pack',
    },
    {
      from: 'react-router',
      to: 'react-router-dom',
    },
    {
      from: '@kbn/ui-shared-deps/monaco',
      to: '@kbn/monaco',
    },
    {
      from: 'monaco-editor',
      to: false,
      disallowedMessage: `Don't import monaco directly, use or add exports to @kbn/monaco`,
    },
    {
      from: 'tinymath',
      to: '@kbn/tinymath',
      disallowedMessage: `Don't use 'tinymath', use '@kbn/tinymath'`,
    },
    {
      from: '@kbn/test/types/ftr',
      to: '@kbn/test',
      disallowedMessage: `import from the root of @kbn/test instead`,
    },
    {
      from: 'react-intl',
      to: '@kbn/i18n-react',
      disallowedMessage: `import from @kbn/i18n-react instead`,
      exclude: toPatterns([/src[\/\\]platform[\/\\]packages[\/\\]shared[\/\\]kbn-i18n-react/]),
    },
    {
      from: 'zod',
      to: '@kbn/zod',
      disallowedMessage: `import from @kbn/zod instead`,
      exclude: toPatterns([/src[\/\\]platform[\/\\]packages[\/\\]shared[\/\\]kbn-zod[\/\\]/]),
    },
    {
      from: 'styled-components',
      to: false,
      exclude: toPatterns(USES_STYLED_COMPONENTS),
      disallowedMessage: `Prefer using @emotion/react instead. To use styled-components, ensure you plugin is enabled in packages/kbn-babel-preset/styled_components_files.js.`,
    },
    {
      from: '@kbn/test/jest',
      to: '@kbn/test-jest-helpers',
      disallowedMessage: `import from @kbn/test-jest-helpers instead`,
    },
    {
      from: '@kbn/utility-types/jest',
      to: '@kbn/utility-types-jest',
      disallowedMessage: `import from @kbn/utility-types-jest instead`,
    },
    {
      from: '@kbn/inspector-plugin',
      to: '@kbn/inspector-plugin/common',
      exact: true,
    },
    {
      from: '@kbn/expressions-plugin',
      to: '@kbn/expressions-plugin/common',
      exact: true,
    },
    {
      from: '@kbn/kibana-utils-plugin',
      to: '@kbn/kibana-utils-plugin/common',
      exact: true,
    },
    {
      from: '@elastic/safer-lodash-set',
      to: '@kbn/safer-lodash-set',
    },
    {
      from: '@elastic/apm-synthtrace',
      to: '@kbn/synthtrace',
    },
    {
      from: 'rison-node',
      to: '@kbn/rison',
    },
    {
      from: '@tanstack/react-query',
      to: '@kbn/react-query',
      exact: true,
      disallowedMessage: `Use \`@kbn/react-query\` instead of \`@tanstack/react-query\`, as it defaults to networkMode="always"`,
    },
    {
      from: 'elastic-apm-node',
      to: false,
      exclude: toPatterns(USES_ELASTIC_APM_AGENT),
      disallowedMessage: `Do not use 'elastic-apm-node' for new instrumentation. Use withActiveSpan from @kbn/tracing-utils instead.`,
    },
    {
      from: 'js-yaml',
      to: false,
      disallowedMessage:
        "Use the `yaml` package instead of js-yaml (e.g. `import yaml from 'yaml'`).",
    },
  ],
];
