/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, OperationTypeNode, type DocumentNode } from 'graphql';
import { z } from 'zod';
import type { GitHubQueryTemplate } from './types';
import { GITHUB_QUERY_TEMPLATES } from './catalog';

/**
 * CONN-006 · package-shippable connector query templates.
 *
 * Lets a Fleet package contribute GitHub GraphQL query templates at install time
 * (instead of compiling them into Kibana). Templates are validated at
 * registration: they must be a single read-only `query` operation, are bounded in
 * size, and are namespaced under the owning package so they cannot clobber core
 * templates or templates owned by another package.
 */

/** Hard cap on a package-contributed document — prevents unbounded-input abuse. */
export const MAX_TEMPLATE_DOCUMENT_LENGTH = 20000;

const NAMESPACE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const TEMPLATE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.]{0,127}$/;
const PAGINATION_VARIABLES = ['$first', '$after'] as const;

export interface ConnectorTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean';
  /** Defaults to true. */
  required?: boolean;
  description?: string;
}

/** Declarative, JSON-serializable template a Fleet package can ship (no Zod / no code). */
export interface ConnectorQueryTemplateDefinition {
  id: string;
  description?: string;
  document: string;
  resultPath: string;
  isPaginated?: boolean;
  variables?: ConnectorTemplateVariable[];
}

export interface RegisterConnectorTemplatesOptions {
  /** Owning package (typically the Fleet package name); namespaces every template id. */
  packageName: string;
  templates: ConnectorQueryTemplateDefinition[];
}

export interface RegisterConnectorTemplatesResult {
  registered: string[];
  errors: Array<{ id: string; reason: string }>;
}

interface RegisteredTemplate {
  template: GitHubQueryTemplate;
  packageName: string;
}

/** Immutable core templates compiled into Kibana. */
const coreTemplateMap = new Map<string, GitHubQueryTemplate>(
  GITHUB_QUERY_TEMPLATES.map((t) => [t.id, t])
);
/** Runtime-registered package templates, with their owning package. */
const registeredTemplateMap = new Map<string, RegisteredTemplate>();

const buildVariablesSchema = (
  variables: ConnectorTemplateVariable[] | undefined
): z.ZodType<Record<string, unknown>> => {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const variable of variables ?? []) {
    let field: z.ZodTypeAny;
    switch (variable.type) {
      case 'number':
        field = z.number();
        break;
      case 'integer':
        field = z.number().int();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      default:
        field = z.string().min(1);
        break;
    }
    shape[variable.name] = variable.required === false ? field.optional() : field;
  }
  return z.object(shape);
};

/** Asserts the document parses and declares exactly one read-only `query` operation. */
const assertReadOnlyDocument = (id: string, document: string): void => {
  let parsed: DocumentNode;
  try {
    parsed = parse(document);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Connector template "${id}" is not valid GraphQL: ${detail}`);
  }
  const operations = parsed.definitions.filter((d) => d.kind === 'OperationDefinition');
  if (operations.length !== 1) {
    throw new Error(
      `Connector template "${id}" must contain exactly one \`query\` operation (found ${operations.length})`
    );
  }
  const operation = operations[0];
  if (operation.kind === 'OperationDefinition' && operation.operation !== OperationTypeNode.QUERY) {
    throw new Error(
      `Connector template "${id}" must contain exactly one \`query\` operation (read-only); found a "${operation.operation}" operation`
    );
  }
};

/** Validates one definition and builds the internal template. Throws with a readable reason. */
const buildTemplate = (
  packageName: string,
  def: ConnectorQueryTemplateDefinition
): GitHubQueryTemplate => {
  if (!TEMPLATE_NAME_PATTERN.test(def.id)) {
    throw new Error(`invalid template id "${def.id}"`);
  }
  const id = def.id.startsWith(`${packageName}.`) ? def.id : `${packageName}.${def.id}`;

  // Check BOTH the raw id and the namespaced id. Checking only the namespaced id
  // would let a package claim a core id (it would simply be prefixed away) and
  // would silently double-prefix an attempt to hijack another package's template.
  for (const candidate of new Set([def.id, id])) {
    if (coreTemplateMap.has(candidate)) {
      throw new Error(
        `template id "${candidate}" is reserved by a core template and cannot be clobbered`
      );
    }
    const existing = registeredTemplateMap.get(candidate);
    if (existing && existing.packageName !== packageName) {
      throw new Error(
        `template id "${candidate}" is already registered by package "${existing.packageName}"`
      );
    }
  }

  if (typeof def.document !== 'string' || def.document.trim().length === 0) {
    throw new Error('document must be a non-empty GraphQL string');
  }
  if (def.document.length > MAX_TEMPLATE_DOCUMENT_LENGTH) {
    throw new Error(
      `document exceeds the maximum of ${MAX_TEMPLATE_DOCUMENT_LENGTH} characters (${def.document.length})`
    );
  }
  assertReadOnlyDocument(id, def.document);

  const isPaginated = def.isPaginated === true;
  if (isPaginated) {
    const missing = PAGINATION_VARIABLES.filter((v) => !def.document.includes(v));
    if (missing.length > 0) {
      throw new Error(
        `paginated template must declare ${PAGINATION_VARIABLES.join(' and ')} pagination variables (missing ${missing.join(', ')})`
      );
    }
  }

  if (typeof def.resultPath !== 'string' || def.resultPath.trim().length === 0) {
    throw new Error('resultPath must be a non-empty dot-separated path');
  }

  return {
    id,
    description: def.description ?? '',
    document: def.document,
    variablesSchema: buildVariablesSchema(def.variables),
    resultPath: def.resultPath,
    isPaginated,
  };
};

/**
 * Registers a batch of package templates. Idempotent per package (re-install replaces),
 * never throws for a bad template — per-template errors are collected in the result.
 * Throws only on programmer error (missing/invalid packageName).
 */
export const registerConnectorQueryTemplates = (
  options: RegisterConnectorTemplatesOptions
): RegisterConnectorTemplatesResult => {
  const { packageName, templates } = options;
  if (!NAMESPACE_PATTERN.test((packageName ?? '').trim())) {
    throw new Error('registerConnectorQueryTemplates: packageName is required');
  }

  const registered: string[] = [];
  const errors: Array<{ id: string; reason: string }> = [];

  for (const def of templates) {
    try {
      const template = buildTemplate(packageName, def);
      registeredTemplateMap.set(template.id, { template, packageName });
      registered.push(template.id);
    } catch (e) {
      errors.push({ id: def?.id ?? '(unknown)', reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return { registered, errors };
};

/** Removes every template owned by a package (install/uninstall symmetry). */
export const unregisterConnectorQueryTemplates = (packageName: string): string[] => {
  const removed: string[] = [];
  for (const [id, entry] of [...registeredTemplateMap.entries()]) {
    if (entry.packageName === packageName) {
      registeredTemplateMap.delete(id);
      removed.push(id);
    }
  }
  return removed;
};

/** Lists registered (non-core) templates with their owning package. */
export const listRegisteredConnectorTemplates = (): Array<{ id: string; packageName: string }> =>
  [...registeredTemplateMap.values()].map(({ template, packageName }) => ({
    id: template.id,
    packageName,
  }));

export const getTemplate = (templateId: string): GitHubQueryTemplate => {
  const template = coreTemplateMap.get(templateId) ?? registeredTemplateMap.get(templateId)?.template;
  if (!template) {
    const validIds = [...coreTemplateMap.keys(), ...registeredTemplateMap.keys()].join(', ');
    throw new Error(`Unknown GitHub GraphQL template "${templateId}". Valid template IDs: ${validIds}`);
  }
  return template;
};

export const listTemplates = (): Array<{ id: string; description: string }> =>
  [...coreTemplateMap.values(), ...[...registeredTemplateMap.values()].map((e) => e.template)].map(
    ({ id, description }) => ({ id, description })
  );
