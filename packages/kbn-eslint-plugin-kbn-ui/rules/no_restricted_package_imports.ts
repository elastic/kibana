/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
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
  alternative: string;
  overrides?: PackageOverride[];
}

export interface BoundariesConfig {
  alwaysAllowed?: string[];
  packages?: Record<string, PackagePolicy>;
}

export interface AssertBoundariesOptions {
  boundariesPath?: string;
  /** When true, each packages key must exist in knownPackageIds. */
  checkKnownPackageIds?: boolean;
  knownPackageIds?: Set<string>;
  /** When true, alwaysAllowed and override paths must exist as dirs under repoRoot. */
  checkPathsOnDisk?: boolean;
  repoRoot?: string;
}

export const BOUNDARIES_PATH = 'src/platform/kbn-ui/_tooling/eslint_boundaries.js';
const requireFromRepo = createRequire(__filename);

let cachedBoundariesConfig: BoundariesConfig | undefined;

const getKnownPackageIds = (): Set<string> => new Set(getPackages(REPO_ROOT).map((pkg) => pkg.id));

const assertPathPrefix = (
  prefix: string,
  label: string,
  {
    boundariesPath,
    checkPathsOnDisk,
    repoRoot,
  }: {
    boundariesPath: string;
    checkPathsOnDisk: boolean;
    repoRoot: string;
  }
): void => {
  if (!prefix?.trim()) {
    throw new Error(`${boundariesPath}: ${label} is empty`);
  }
  if (!prefix.endsWith('/')) {
    throw new Error(`${boundariesPath}: ${label} "${prefix}" must end with /`);
  }
  if (checkPathsOnDisk) {
    const absolute = path.join(repoRoot, prefix);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) {
      throw new Error(
        `${boundariesPath}: ${label} "${prefix}" is not an existing directory under the repo root`
      );
    }
  }
};

/**
 * Validates eslint_boundaries policy shape. Optionally checks that package ids
 * exist in the repo and that allowlist path prefixes exist on disk.
 */
export const assertBoundariesConfig = (
  config: BoundariesConfig,
  options: AssertBoundariesOptions = {}
): void => {
  const boundariesPath = options.boundariesPath ?? BOUNDARIES_PATH;
  const checkKnownPackageIds = options.checkKnownPackageIds ?? false;
  const checkPathsOnDisk = options.checkPathsOnDisk ?? false;
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const knownPackageIds =
    options.knownPackageIds ?? (checkKnownPackageIds ? getKnownPackageIds() : undefined);

  for (const prefix of config.alwaysAllowed ?? []) {
    assertPathPrefix(prefix, 'alwaysAllowed path', {
      boundariesPath,
      checkPathsOnDisk,
      repoRoot,
    });
  }

  for (const [pkgId, policy] of Object.entries(config.packages ?? {})) {
    if (checkKnownPackageIds && knownPackageIds && !knownPackageIds.has(pkgId)) {
      throw new Error(`${boundariesPath}: unknown package "${pkgId}"`);
    }

    if (!policy.alternative?.trim()) {
      throw new Error(`${boundariesPath}: ${pkgId} is missing alternative`);
    }

    for (const override of policy.overrides ?? []) {
      if (!override.path?.trim()) {
        throw new Error(`${boundariesPath}: ${pkgId} override is missing path`);
      }
      if (!override.reason?.trim()) {
        throw new Error(
          `${boundariesPath}: ${pkgId} override "${override.path}" is missing reason`
        );
      }
      assertPathPrefix(override.path, `${pkgId} override path`, {
        boundariesPath,
        checkPathsOnDisk,
        repoRoot,
      });
    }
  }
};

const loadBoundariesConfig = (): BoundariesConfig => {
  if (!cachedBoundariesConfig) {
    const config = requireFromRepo(path.join(REPO_ROOT, BOUNDARIES_PATH)) as BoundariesConfig;
    assertBoundariesConfig(config, {
      checkKnownPackageIds: true,
      checkPathsOnDisk: true,
    });
    cachedBoundariesConfig = config;
  }
  return cachedBoundariesConfig;
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

const matchRestrictedPackage = (
  request: string,
  restrictedPackageIds: Set<string>
): string | undefined => {
  let match: string | undefined;
  for (const pkgId of restrictedPackageIds) {
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
      description: 'Disallow importing listed @kbn/ui-* packages outside allowlisted paths',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      restrictedImport:
        "Do not import '{{package}}' outside allowlisted paths. {{alternative}} See {{boundariesPath}}.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          alwaysAllowed: {
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
              required: ['alternative'],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] as BoundariesConfig | undefined;
    // Only treat options as the full policy when they list packages. An empty
    // `{}` / partial options object must not disable the on-disk boundaries.
    const useInjected = !!options?.packages && Object.keys(options.packages).length > 0;
    const config = useInjected ? options : loadBoundariesConfig();

    if (useInjected) {
      assertBoundariesConfig(config);
    }

    const alwaysAllowed = config.alwaysAllowed ?? [];
    const packagePolicies = config.packages ?? {};
    const restrictedPackageIds = new Set(Object.keys(packagePolicies));

    const filename = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename();
    const repoRelativePath = toRepoRelative(filename);

    const checkSource = (request: string | undefined, node: Node) => {
      if (!request) {
        return;
      }

      const pkg = matchRestrictedPackage(request, restrictedPackageIds);
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
          alternative: policy.alternative,
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
