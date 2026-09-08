/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { ErrorObject } from 'ajv';
import {
  parseYamlToJSONWithoutValidation,
  isVariableValue,
  isDynamicValue,
  isLiquidTagValue,
} from '@kbn/workflows-yaml';
import { TemplateMetadataSchema } from '@kbn/workflows-library';
import type { ValidationIssue, ValidationVariant, VariantMode } from './types';
import { isErrorIssue } from './types';
import type { SchemaValidateFn } from './create_schema_validator';

/** Root key that marks a file as an installable library template. */
export const METADATA_KEY = 'template-metadata';

/**
 * Even with the native discriminator anchoring each step to its own branch, a
 * single step can still yield a handful of intra-branch errors (e.g. an `anyOf`
 * template-tolerant property). Dedupe by path+message and cap so the report
 * stays readable.
 */
const MAX_SCHEMA_ISSUES = 20;

export interface ValidateFileInput {
  yaml: string;
  /** Injected schema validator (the CLI backs this with a worker thread). */
  validateSchema: SchemaValidateFn;
  /** `auto` selects the variant per file; otherwise the given variant is forced. */
  variantMode: VariantMode;
}

export interface FileSchemaResult {
  isTemplate: boolean;
  /** Variant used for body/document validation, or null when YAML failed to parse. */
  variant: ValidationVariant | null;
  /** Schema + metadata + yaml-syntax issues. */
  issues: ValidationIssue[];
  /** True when no error-severity schema/metadata/syntax issues were found (gate for the semantic layer). Warnings do not block it. */
  schemaPassed: boolean;
  /** The workflow object (template-metadata stripped) for the semantic layer, or null. */
  body: Record<string, unknown> | null;
  /** The parsed YAML document (always available) for the Liquid layer. */
  document: Document;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** ajv `instancePath` (e.g. `/steps/0/type`) -> dotted path (`steps.0.type`). */
const formatInstancePath = (instancePath: string): string =>
  instancePath === '' ? '<root>' : instancePath.replace(/^\//, '').replace(/\//g, '.');

/** Undo JSON Pointer escaping (`~1` -> `/`, `~0` -> `~`) for one path segment. */
const decodePointerSegment = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

/** Resolve the value the parsed document holds at an ajv JSON-Pointer `instancePath`. */
const resolveInstanceValue = (target: unknown, instancePath: string): unknown => {
  if (instancePath === '') {
    return target;
  }
  let value: unknown = target;
  for (const segment of instancePath.split('/').slice(1).map(decodePointerSegment)) {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
};

/**
 * A value is a LiquidJS expression when it is a whole-value `{{ }}` / `${{ }}`,
 * or contains a `{% %}` tag — the exact predicates the in-Kibana runtime uses to
 * suppress schema errors. Kept in lock-step so the CLI, runtime, and weaver share
 * one notion of "this value is dynamic".
 */
const isLiquidjsValue = (value: unknown): boolean =>
  isVariableValue(value) || isDynamicValue(value) || isLiquidTagValue(value);

/**
 * Managed-workflow install-time token, e.g. `__DETECTION_INTERVAL_MINUTES__`.
 * These are exact-token-replaced (upper-snake, double-underscore-delimited) when
 * a managed workflow is installed, so at authoring time they appear both as a
 * whole value (`__X__`, in a number position) and embedded in a string
 * (`__X__m`). Distinct from the lowercase `__install__.<name>` library
 * placeholder. Only tolerated under `--variant managed`.
 */
const MANAGED_PLACEHOLDER_REGEX = /__[A-Z0-9_]+__/;
const isManagedPlaceholderValue = (value: unknown): boolean =>
  typeof value === 'string' && MANAGED_PLACEHOLDER_REGEX.test(value);

/**
 * Instance paths whose *own* value should have strict validation skipped: a
 * LiquidJS expression, or (only when `tolerateManagedPlaceholders`) a managed
 * install-time `__SOMETHING__` token. Scalar-only: a structural error anchored
 * on a parent object (e.g. a templated step `type`, reported at `/steps/N`)
 * resolves to an object, not a template, so it is not collected and stays a
 * failing error.
 */
const collectToleratedPaths = (
  errors: ErrorObject[],
  target: unknown,
  tolerateManagedPlaceholders: boolean
): Set<string> => {
  const paths = new Set<string>();
  for (const error of errors) {
    const value = resolveInstanceValue(target, error.instancePath);
    const tolerated =
      isLiquidjsValue(value) || (tolerateManagedPlaceholders && isManagedPlaceholderValue(value));
    if (tolerated) {
      paths.add(error.instancePath);
    }
  }
  return paths;
};

interface DiscriminatorParams {
  error?: string;
  tag?: string;
  tagValue?: string;
}

/** Turn an ajv error into a readable issue, special-casing discriminator/additionalProperties. */
const toIssue = (error: ErrorObject): ValidationIssue => {
  if (error.keyword === 'discriminator') {
    const { error: kind, tag = 'type', tagValue } = error.params as DiscriminatorParams;
    const base = formatInstancePath(error.instancePath);
    if (kind === 'mapping') {
      // The `type` value did not match any branch of the discriminated union.
      return {
        source: 'schema',
        message: `unknown step type "${tagValue}"`,
        path: base === '<root>' ? tag : `${base}.${tag}`,
      };
    }
    // Missing/non-string discriminator tag.
    return {
      source: 'schema',
      message: `must have a string "${tag}"`,
      path: base,
    };
  }

  if (error.keyword === 'additionalProperties') {
    const extra = (error.params as { additionalProperty?: string })?.additionalProperty;
    if (extra) {
      return {
        source: 'schema',
        message: `must NOT have additional property '${extra}'`,
        path: formatInstancePath(error.instancePath),
      };
    }
  }

  return {
    source: 'schema',
    message: error.message ?? 'Invalid value',
    path: formatInstancePath(error.instancePath),
  };
};

/** Keywords that pinpoint the real problem (as opposed to branch-selection noise). */
const SPECIFIC_KEYWORDS = new Set([
  'additionalProperties',
  'required',
  'const',
  'enum',
  'discriminator',
]);
/** The `anyOf`/`oneOf` wrappers only say "no branch matched" — never actionable alone. */
const isBranchWrapper = (error: ErrorObject): boolean =>
  error.keyword === 'anyOf' || error.keyword === 'oneOf';
/** Noise from the Liquid-template-value alternative that shadows most fields. */
const isTemplateValueNoise = (error: ErrorObject): boolean =>
  error.keyword === 'pattern' ||
  // ajv puts the expected type in `params`, so this does not depend on the
  // rendered message text (`must be string`).
  (error.keyword === 'type' && (error.params as { type?: string }).type === 'string');
/** Wrapper/template noise that is only meaningful when nothing deeper explains the failure. */
const isNoise = (error: ErrorObject): boolean =>
  isBranchWrapper(error) || isTemplateValueNoise(error);

/**
 * Within a single location, a property is often `anyOf: [<real schema>, <template
 * value>]`, so a real violation (e.g. an unknown `with` key) is buried under
 * "must be string" + "must match a schema in anyOf". Group by location and, when
 * a specific error exists there, drop the branch/template noise for that location.
 */
const pruneBranchNoise = (errors: ErrorObject[]): ErrorObject[] => {
  const byPath = new Map<string, ErrorObject[]>();
  for (const error of errors) {
    const group = byPath.get(error.instancePath);
    if (group) {
      group.push(error);
    } else {
      byPath.set(error.instancePath, [error]);
    }
  }

  const kept: ErrorObject[] = [];
  for (const group of byPath.values()) {
    const specific = group.filter((error) => SPECIFIC_KEYWORDS.has(error.keyword));
    if (specific.length > 0) {
      kept.push(...specific);
      continue;
    }
    const meaningful = group.filter((error) => !isNoise(error));
    if (meaningful.length > 0) {
      kept.push(...meaningful);
      continue;
    }
    // Only wrapper/template noise here: keep one readable representative.
    const representative = group.find((error) => !isBranchWrapper(error)) ?? group[0];
    if (representative) {
      kept.push(representative);
    }
  }
  return kept;
};

/**
 * Drop a wrapper/template-noise error at a path that is a strict ancestor of a
 * kept error. When a step deep inside `steps` fails, the tolerant `steps`/`with`
 * `anyOf` wrappers also fire ("must be string" / "must match a schema in anyOf")
 * one level up; the deeper, specific error already explains the failure.
 */
const pruneAncestorNoise = (
  errors: ErrorObject[],
  extraAnchors: ReadonlySet<string> = new Set()
): ErrorObject[] => {
  // Anchors are the surviving errors plus any LiquidJS-valued paths: wrapper
  // noise firing one level up from a tolerated template value is just as
  // uninformative as noise above a deeper real error.
  const paths = [...errors.map((error) => error.instancePath), ...extraAnchors];
  const isStrictAncestorOfAny = (path: string): boolean =>
    paths.some((other) => other !== path && other.startsWith(`${path}/`));
  return errors.filter((error) => !(isNoise(error) && isStrictAncestorOfAny(error.instancePath)));
};

/**
 * Drop the branch-selection artifacts a `oneOf`/`anyOf` union emits at its own
 * node when the selected branch fails *only* because of a tolerated (LiquidJS or
 * managed-placeholder) descendant. Example: the scheduled trigger's
 * `with: [{ every }, { rrule }]` union — a placeholder `every` fails branch 0 at
 * the tolerated scalar `.../with/every`, so ajv also reports the sibling `rrule`
 * branch's `required` / `additionalProperties` errors anchored on the `.../with`
 * object. Those are not on the tolerated scalar and use "specific" keywords, so
 * they would otherwise survive as spurious failures. Any genuine content error
 * lives at a deeper path (e.g. `.../with/rrule/interval`) and is never at the
 * union node itself, so removing errors anchored exactly on the union node is
 * safe. Only invoked under `--variant managed` (see `toSchemaIssues`): a
 * LiquidJS-caused union artifact under strict/template/auto stays a failing
 * error, unchanged from prior behavior.
 */
const pruneToleratedUnionArtifacts = (
  errors: ErrorObject[],
  toleratedPaths: ReadonlySet<string>
): ErrorObject[] => {
  if (toleratedPaths.size === 0) {
    return errors;
  }
  const tolerated = [...toleratedPaths];
  const unionNodes = new Set(
    errors
      .filter(isBranchWrapper)
      .map((error) => error.instancePath)
      .filter((unionPath) => tolerated.some((path) => path.startsWith(`${unionPath}/`)))
  );
  if (unionNodes.size === 0) {
    return errors;
  }
  return errors.filter((error) => !unionNodes.has(error.instancePath));
};

/** Dedupe issues by path+message and cap the count for readability. */
const dedupeAndCap = (issues: ValidationIssue[]): ValidationIssue[] => {
  const seen = new Set<string>();
  const deduped: ValidationIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.path ?? ''}|${issue.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(issue);
  }

  if (deduped.length <= MAX_SCHEMA_ISSUES) {
    return deduped;
  }
  const capped = deduped.slice(0, MAX_SCHEMA_ISSUES);
  capped.push({
    source: 'schema',
    message: `... and ${deduped.length - MAX_SCHEMA_ISSUES} more schema error(s)`,
  });
  return capped;
};

/**
 * One non-failing warning per tolerated path (collapses the oneOf/anyOf noise
 * there). A LiquidJS-valued path is reported as a `liquidjs-expression`; a
 * managed install-time token as a `managed-placeholder`.
 */
const toToleratedWarnings = (
  toleratedPaths: ReadonlySet<string>,
  target: unknown
): ValidationIssue[] =>
  [...toleratedPaths].map((path) =>
    isLiquidjsValue(resolveInstanceValue(target, path))
      ? {
          source: 'liquidjs-expression' as const,
          severity: 'warning' as const,
          message: 'strict validation skipped (liquidjs expression)',
          path: formatInstancePath(path),
        }
      : {
          source: 'managed-placeholder' as const,
          severity: 'warning' as const,
          message: 'strict validation skipped (managed placeholder)',
          path: formatInstancePath(path),
        }
  );

/**
 * Turn ajv's raw errors into readable, de-noised issues. Errors whose value is a
 * LiquidJS expression (or, under `--variant managed`, a managed `__SOMETHING__`
 * token) are reclassified as a single non-failing warning per path (mirroring the
 * runtime's suppression); the rest are pruned of tolerant `anyOf`/`oneOf`
 * template-value noise (same-location and ancestor), then mapped, deduped and
 * capped as failing errors.
 */
const toSchemaIssues = (
  errors: ErrorObject[],
  target: unknown,
  tolerateManagedPlaceholders: boolean
): ValidationIssue[] => {
  const toleratedPaths = collectToleratedPaths(errors, target, tolerateManagedPlaceholders);

  const filteredErrors = errors.filter((error) => !toleratedPaths.has(error.instancePath));
  // Union-artifact pruning is a managed-only relaxation; strict/template/auto
  // keep a LiquidJS-caused sibling-branch error as failing.
  const realErrors = tolerateManagedPlaceholders
    ? pruneToleratedUnionArtifacts(filteredErrors, toleratedPaths)
    : filteredErrors;
  const denoised = pruneAncestorNoise(pruneBranchNoise(realErrors), toleratedPaths);
  const errorIssues = dedupeAndCap(denoised.map(toIssue));

  return [...errorIssues, ...toToleratedWarnings(toleratedPaths, target)];
};

/**
 * The JSON-Schema validation layer. Parses the YAML, detects installable
 * templates (by the `template-metadata` root key), validates + strips that block
 * for templates, and validates the document/body against the selected ajv
 * variant.
 */
export const validateFile = async ({
  yaml,
  validateSchema,
  variantMode,
}: ValidateFileInput): Promise<FileSchemaResult> => {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  const { document } = parsed;

  // `parseDocument` is error-tolerant: syntax errors land on `document.errors`
  // rather than throwing, so check both signals before trusting the JSON.
  const yamlErrors = document.errors ?? [];
  if (!parsed.success || yamlErrors.length > 0) {
    const issues: ValidationIssue[] = yamlErrors.length
      ? yamlErrors.map((error) => {
          const pos = error.linePos?.[0];
          return {
            source: 'yaml-syntax' as const,
            message: error.message,
            line: pos?.line,
            column: pos?.col,
          };
        })
      : [
          {
            source: 'yaml-syntax',
            message: parsed.success ? 'Invalid YAML' : parsed.error.message,
          },
        ];

    return {
      isTemplate: false,
      variant: null,
      issues,
      schemaPassed: false,
      body: null,
      document,
    };
  }

  const { json } = parsed;
  const isTemplate = isRecord(json) && METADATA_KEY in json;
  // `managed` is not a published schema; it validates against `strict` and layers
  // on managed-placeholder tolerance below (see `toSchemaIssues`).
  const tolerateManagedPlaceholders = variantMode === 'managed';
  const variant: ValidationVariant =
    variantMode === 'auto'
      ? isTemplate
        ? 'template'
        : 'strict'
      : variantMode === 'managed'
      ? 'strict'
      : variantMode;

  const issues: ValidationIssue[] = [];
  let body: Record<string, unknown> | null = isRecord(json) ? json : null;

  if (isTemplate && isRecord(json)) {
    const { [METADATA_KEY]: metadata, ...rest } = json;
    body = rest;

    // Authoring/CI linter: reject unknown metadata keys (strict schema).
    const metaResult = TemplateMetadataSchema.safeParse(metadata);
    if (!metaResult.success) {
      for (const issue of metaResult.error.issues) {
        const sub = issue.path.map(String).join('.');
        issues.push({
          source: 'metadata',
          message: issue.message,
          path: sub ? `${METADATA_KEY}.${sub}` : METADATA_KEY,
        });
      }
    }
  }

  const target = isTemplate ? body : json;

  // Full-document validation. The artifact's step/trigger unions carry a
  // `discriminator`, so ajv validates each step only against its `type`'s branch:
  // errors come back already anchored (e.g. `/steps/3/with`) with no cross-branch
  // explosion. We de-noise the tolerant `anyOf` template wrappers and report.
  // `validateSchema` runs in a worker thread with an enlarged stack so deeply
  // nested workflows validate without overflowing the call stack.
  const { errors: schemaErrors, overflowed } = await validateSchema(variant, target);

  if (overflowed) {
    issues.push({
      source: 'schema',
      message: 'Schema validation could not complete (document too deeply nested for the schema)',
      path: '<root>',
    });
  } else if (schemaErrors.length > 0) {
    const schemaIssues = toSchemaIssues(schemaErrors, target, tolerateManagedPlaceholders);
    // Safety net: never drop a failure to zero issues.
    issues.push(
      ...(schemaIssues.length > 0
        ? schemaIssues
        : [{ source: 'schema' as const, message: 'Invalid workflow', path: '<root>' }])
    );
  }

  return {
    isTemplate,
    variant,
    issues,
    // Warnings (e.g. skipped LiquidJS positions) do not gate the semantic layer;
    // only error-severity issues do.
    schemaPassed: !issues.some(isErrorIssue),
    body,
    document,
  };
};
