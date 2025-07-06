/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Linter } from 'eslint';

/**
 * A string specifying a module name to restrict.
 */
export type RestrictedImportString = string;

/**
 * Configuration for restricting a specific import path.
 */
export interface RestrictedImportPath {
  /** The name of the module to restrict. */
  name: string;
  /** Custom message appended to the lint error. */
  message?: string;
  /** Specific named imports to restrict. */
  importNames?: string[];
  /** Named imports to allow (restricts all others). */
  allowImportNames?: string[];
}

/**
 * Configuration for restricting imports using gitignore-style patterns.
 */
export interface RestrictedImportPatternGroup {
  /** Array of gitignore-style patterns to restrict. */
  group: string[];
  /** Custom message. */
  message?: string;
  /** Named imports to restrict within the group. */
  importNames?: string[];
  /** Named imports to allow within the group. */
  allowImportNames?: string[];
  /** Whether the pattern is case-sensitive. */
  caseSensitive?: boolean;
}

/**
 * Configuration for restricting imports using regex patterns.
 */
export interface RestrictedImportPatternRegex {
  /** Regex pattern string to restrict. */
  regex: string;
  /** Custom message. */
  message?: string;
  /** Named imports to restrict within the regex. */
  importNames?: string[];
  /** Named imports to allow within the regex. */
  allowImportNames?: string[];
  /** Whether the regex is case-sensitive. */
  caseSensitive?: boolean;
}

/**
 * Options for the no-restricted-imports rule.
 */
export interface RestrictedImportOptions {
  /** List of module names or path configurations to restrict. */
  paths?: Array<RestrictedImportString | RestrictedImportPath>;
  /** List of patterns to restrict. */
  patterns?: Array<string | RestrictedImportPatternGroup | RestrictedImportPatternRegex>;
}

/**
 * ESLint rule severity levels.
 */
export type RuleSeverity = 'error' | 'warn' | 'off' | 0 | 1 | 2;

/**
 * Complete ESLint rule configuration for no-restricted-imports.
 */
export type NoRestrictedImportsRuleConfig =
  | Linter.RuleLevel
  | [
      Linter.RuleLevel,
      ...Array<
        | RestrictedImportString
        | RestrictedImportPath
        | RestrictedImportPatternGroup
        | RestrictedImportPatternRegex
        | RestrictedImportOptions
      >
    ];

/**
 * Options for creating override configurations.
 */
export interface CreateOverrideOptions {
  /** Additional restricted imports to add. */
  restrictedImports?: Array<RestrictedImportString | RestrictedImportPath>;
}
