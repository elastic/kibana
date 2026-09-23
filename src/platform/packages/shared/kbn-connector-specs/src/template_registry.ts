/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';

/**
 * A read-only GraphQL query template that can be registered by a Fleet package
 * at install time and called via the connector's `runQueryTemplate` action.
 */
export interface QueryTemplate {
  /** Namespaced template ID (e.g. "myPkg.roadmap"). Must not clobber core templates. */
  id: string;
  /** The GraphQL query string. Must be read-only (no mutations). */
  query: string;
  /** Description shown in UI and error messages. */
  description?: string;
  /** Input schema for template variables. */
  input?: z.ZodObject;
}

const MUTATION_PATTERN = /\b(mutation|createMutation|updateMutation|deleteMutation)\b/i;

/**
 * Registry for connector query templates that can be extended at runtime
 * by Fleet packages without a kibana-core merge.
 */
export class ConnectorTemplateRegistry {
  private readonly templates = new Map<string, QueryTemplate>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a package-shippable query template.
   * Templates are validated as read-only and namespaced to prevent clobbering.
   */
  register(template: QueryTemplate): void {
    // Validate: no mutations
    if (MUTATION_PATTERN.test(template.query)) {
      throw new Error(
        `Template "${template.id}" contains a GraphQL mutation — only read-only queries are allowed`
      );
    }

    // Validate: namespace prefix (must contain a dot to prevent clobbering core templates)
    if (!template.id.includes('.')) {
      throw new Error(`Template id "${template.id}" must be namespaced (e.g. "myPkg.myQuery")`);
    }

    // Validate: no clobbering existing core template
    if (this.templates.has(template.id)) {
      throw new Error(`Template "${template.id}" is already registered`);
    }

    this.templates.set(template.id, template);
    this.logger.info(`Registered connector query template: ${template.id}`);
  }

  /**
   * Resolve a template by ID. Returns undefined if not found.
   */
  get(id: string): QueryTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * List all registered template IDs.
   */
  list(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Remove all templates registered by a specific package (used on uninstall).
   */
  removeByPackage(packageName: string): number {
    const prefix = `${packageName}.`;
    let count = 0;
    for (const id of Array.from(this.templates.keys())) {
      if (id.startsWith(prefix)) {
        this.templates.delete(id);
        count++;
      }
    }
    if (count > 0) {
      this.logger.info(`Removed ${count} templates for package: ${packageName}`);
    }
    return count;
  }
}
