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
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import { TemplateMetadataSchema } from '@kbn/workflows-library';
import type { ValidationIssue, ValidationVariant, VariantMode } from './types';
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
  /** True when no schema/metadata/syntax issues were found (gate for the semantic layer). */
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
  error.keyword === 'pattern' || (error.keyword === 'type' && error.message === 'must be string');
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
const pruneAncestorNoise = (errors: ErrorObject[]): ErrorObject[] => {
  const paths = errors.map((error) => error.instancePath);
  const isStrictAncestorOfAny = (path: string): boolean =>
    paths.some((other) => other !== path && other.startsWith(`${path}/`));
  return errors.filter((error) => !(isNoise(error) && isStrictAncestorOfAny(error.instancePath)));
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
 * Turn ajv's raw errors into readable, de-noised issues: prune the tolerant
 * `anyOf` template-value noise (both same-location and ancestor), then map,
 * dedupe and cap.
 */
const toSchemaIssues = (errors: ErrorObject[]): ValidationIssue[] => {
  const denoised = pruneAncestorNoise(pruneBranchNoise(errors));
  return dedupeAndCap(denoised.map(toIssue));
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
  const variant: ValidationVariant =
    variantMode === 'auto' ? (isTemplate ? 'template' : 'strict') : variantMode;

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
    const schemaIssues = toSchemaIssues(schemaErrors);
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
    schemaPassed: issues.length === 0,
    body,
    document,
  };
};
