/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The two schema variants published in the artifact. */
export const VARIANTS = ['strict', 'template'] as const;
export type ValidationVariant = (typeof VARIANTS)[number];

/** The `--variant` flag: `auto` picks per file, otherwise force a variant. */
export type VariantMode = 'auto' | ValidationVariant;

/**
 * Where a single validation issue originated.
 *
 * `liquidjs-expression` is distinct from `liquid`: the latter is a LiquidJS
 * *syntax* error (from `validateLiquid`), while the former marks a schema
 * constraint that was intentionally skipped because the value is a whole-value
 * LiquidJS expression (see `validate_file.ts`).
 */
export type IssueSource =
  | 'yaml-syntax'
  | 'schema'
  | 'metadata'
  | 'step-name'
  | 'graph'
  | 'liquid'
  | 'liquidjs-expression';

/** Severity of a single issue. An absent severity is treated as an error. */
export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  source: IssueSource;
  message: string;
  /** Severity of the issue; absent means `error`. */
  severity?: IssueSeverity;
  /** Dotted instance path (schema/metadata/step-name/graph issues). */
  path?: string;
  /** 1-based source line (Liquid issues). */
  line?: number;
  /** 1-based source column (Liquid issues). */
  column?: number;
}

/** An issue fails the run unless it is explicitly a warning. */
export const isErrorIssue = (issue: ValidationIssue): boolean => issue.severity !== 'warning';

export interface ValidationOutcome {
  /** Absolute path to the validated file. */
  file: string;
  /** True when there are no error-severity issues (warnings do not fail the run). */
  ok: boolean;
  /** Whether the file was detected as an installable template. */
  isTemplate: boolean;
  /** The schema variant used for the body/document, or null if parsing failed. */
  variant: ValidationVariant | null;
  issues: ValidationIssue[];
}
