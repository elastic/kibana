/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { createRequire } from 'module';
import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

export interface PackageOverride {
  path: string;
  reason: string;
}

export interface PackagePolicy {
  alternative?: string;
  overrides?: PackageOverride[];
}

export interface BoundariesConfig {
  alwaysAllowed?: string[];
  packages?: Record<string, PackagePolicy>;
}

interface RuleOptions extends BoundariesConfig {
  /** Test-only: private package ids. Production discovers these from manifests. */
  privatePackages?: string[];
}

interface DiscoverablePackage {
  id: string;
  normalizedRepoRelativeDir: string;
  manifest: { visibility?: string };
}

export const BOUNDARIES_PATH = 'src/platform/kbn-ui/_tooling/eslint_boundaries.js';
export const KBN_UI_DIR_PREFIX = 'src/platform/kbn-ui/';
const DEFAULT_ALTERNATIVE =
  'This package is private; use the owning plugin or core facade instead.';
const requireFromRepo = createRequire(__filename);

let cachedPrivateUiPackageIds: Set<string> | undefined;

/**
 * Private `@kbn/ui-*` packages under `src/platform/kbn-ui/`, using manifest
 * visibility (not path-derived Package.visibility).
 */
export const getPrivateKbnUiPackageIds = (
  packages: DiscoverablePackage[] = getPackages(REPO_ROOT)
): Set<string> => {
  return new Set(
    packages
      .filter(
        (pkg) =>
          pkg.normalizedRepoRelativeDir.startsWith(KBN_UI_DIR_PREFIX) &&
          pkg.manifest.visibility === 'private'
      )
      .map((pkg) => pkg.id)
  );
};

export const assertBoundariesConfig = (
  config: BoundariesConfig,
  boundariesPath: string = BOUNDARIES_PATH
): void => {
  for (const [pkgId, policy] of Object.entries(config.packages ?? {})) {
    for (const override of policy.overrides ?? []) {
      if (!override.path?.trim()) {
        throw new Error(`${boundariesPath}: ${pkgId} override is missing path`);
      }
      if (!override.reason?.trim()) {
        throw new Error(
          `${boundariesPath}: ${pkgId} override "${override.path}" is missing reason`
        );
      }
    }
  }
};

const loadBoundariesConfig = (): BoundariesConfig => {
  const config = requireFromRepo(path.join(REPO_ROOT, BOUNDARIES_PATH)) as BoundariesConfig;
  assertBoundariesConfig(config);
  return config;
};

const discoverPrivateUiPackageIds = (): Set<string> => {
  if (!cachedPrivateUiPackageIds) {
    cachedPrivateUiPackageIds = getPrivateKbnUiPackageIds();
  }
  return cachedPrivateUiPackageIds;
};

const getStringLiteral = (node: unknown): string | undefined => {
  if (
    node &&
    typeof node === 'object' &&
    'type' in node &&
    (node as { type: string }).type === 'Literal' &&
    'value' in node &&
    typeof (node as { value: unknown }).value === 'string'
  ) {
    return (node as { value: string }).value;
  }
  return undefined;
};

const matchPrivatePackage = (
  request: string,
  privatePackageIds: Set<string>
): string | undefined => {
  let match: string | undefined;
  for (const pkgId of privatePackageIds) {
    if (request === pkgId || request.startsWith(`${pkgId}/`)) {
      if (!match || pkgId.length > match.length) {
        match = pkgId;
      }
    }
  }
  return match;
};

const toRepoRelative = (filename: string): string => {
  const normalized = filename.split(path.sep).join('/');
  const root = REPO_ROOT.split(path.sep).join('/');
  if (normalized.startsWith(`${root}/`)) {
    return normalized.slice(root.length + 1);
  }
  // RuleTester and some callers pass already-relative paths
  return normalized.replace(/^\//, '');
};

const isAllowed = (repoRelativePath: string, allowPrefixes: string[]): boolean =>
  allowPrefixes.some((prefix) => repoRelativePath.startsWith(prefix));

export const NoRestrictedPackageImports: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing private @kbn/ui-* packages outside their owning packages',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      restrictedImport:
        "Do not import '{{package}}' outside its owning packages. {{alternative}} See {{boundariesPath}}.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          alwaysAllowed: {
            type: 'array',
            items: { type: 'string' },
          },
          privatePackages: {
            type: 'array',
            items: { type: 'string' },
          },
          packages: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                alternative: { type: 'string' },
                overrides: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      reason: { type: 'string' },
                    },
                    required: ['path', 'reason'],
                    additionalProperties: false,
                  },
                },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = (context.options[0] ?? {}) as RuleOptions;
    // Tests inject `privatePackages`; production loads policy from disk and
    // discovers private kbn-ui package ids from manifests.
    const config: BoundariesConfig = options.privatePackages ? options : loadBoundariesConfig();

    assertBoundariesConfig(config);

    const alwaysAllowed = config.alwaysAllowed ?? [];
    const packagePolicies = config.packages ?? {};
    const privatePackageIds = options.privatePackages
      ? new Set(options.privatePackages)
      : discoverPrivateUiPackageIds();

    const filename = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename();
    const repoRelativePath = toRepoRelative(filename);

    const checkSource = (request: string | undefined, node: Node) => {
      if (!request) {
        return;
      }

      const pkg = matchPrivatePackage(request, privatePackageIds);
      if (!pkg) {
        return;
      }

      const policy = packagePolicies[pkg];
      const overridePaths = (policy?.overrides ?? []).map((override) => override.path);
      const allowPrefixes = [...alwaysAllowed, ...overridePaths];
      if (isAllowed(repoRelativePath, allowPrefixes)) {
        return;
      }

      context.report({
        node,
        messageId: 'restrictedImport',
        data: {
          package: pkg,
          alternative: policy?.alternative ?? DEFAULT_ALTERNATIVE,
          boundariesPath: BOUNDARIES_PATH,
        },
      });
    };

    return {
      ImportDeclaration(node) {
        checkSource(getStringLiteral(node.source), node);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkSource(getStringLiteral(node.source), node);
        }
      },
      ExportAllDeclaration(node) {
        checkSource(getStringLiteral(node.source), node);
      },
      ImportExpression(node) {
        checkSource(getStringLiteral(node.source), node as unknown as Node);
      },
      CallExpression(node) {
        const { callee, arguments: args } = node;

        // require('...')
        if (callee.type === 'Identifier' && callee.name === 'require') {
          checkSource(getStringLiteral(args[0]), node);
        }
      },
    };
  },
};
