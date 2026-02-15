/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';

/**
 * Workflow Types Registry
 *
 * A centralized registry of reusable JSON Schema type definitions for workflows.
 * This allows workflows to reference common types via $ref, promoting consistency
 * and reducing duplication.
 *
 * Usage in workflow YAML:
 * ```yaml
 * inputs:
 *   properties:
 *     user:
 *       $ref: "http://localhost:5601/hdz/api/workflows/types-registry.json#/definitions/User"
 *     address:
 *       $ref: "http://localhost:5601/hdz/api/workflows/types-registry.json#/definitions/Address"
 * ```
 * Note: Replace /hdz with your actual base path if different
 *
 * Best Practices:
 * - Keep definitions focused and reusable
 * - Use descriptive names
 * - Include defaults where appropriate
 * - Document with descriptions
 * - Version the registry if breaking changes are needed
 */
export const typesRegistry: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'http://localhost:5601/api/workflows/types-registry.json',
  title: 'Workflow Types Registry',
  description: 'Centralized registry of reusable JSON Schema type definitions for workflows',
  definitions: {
    User: {
      type: 'object',
      title: 'User',
      description: 'A user with contact information',
      properties: {
        name: {
          type: 'string',
          description: 'Full name of the user',
          default: 'John Doe',
          minLength: 1,
          maxLength: 100,
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address (validated per RFC5321)',
          default: 'user@example.com',
        },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'viewer', 'editor'],
          description: 'User role',
          default: 'user',
        },
      },
      required: ['name', 'email'],
      additionalProperties: false,
    },
    Address: {
      type: 'object',
      title: 'Address',
      description: 'Physical address information',
      properties: {
        street: {
          type: 'string',
          description: 'Street address',
          default: '123 Main St',
          minLength: 1,
        },
        city: {
          type: 'string',
          description: 'City name',
          default: 'San Francisco',
          minLength: 1,
        },
        state: {
          type: 'string',
          description: 'State or province',
          default: 'CA',
          minLength: 2,
          maxLength: 2,
        },
        zipCode: {
          type: 'string',
          description: 'ZIP or postal code',
          default: '94102',
          pattern: '^\\d{5}(-\\d{4})?$',
        },
        country: {
          type: 'string',
          description: 'Country code (ISO 3166-1 alpha-2)',
          default: 'US',
          pattern: '^[A-Z]{2}$',
        },
      },
      required: ['street', 'city', 'state', 'zipCode', 'country'],
      additionalProperties: false,
    },
    ContactInfo: {
      type: 'object',
      title: 'Contact Information',
      description: 'Contact details for a person or organization',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address',
          default: 'contact@example.com',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
          pattern: '^\\+?[1-9]\\d{1,14}$',
        },
        website: {
          type: 'string',
          format: 'uri',
          description: 'Website URL',
          default: 'https://example.com',
        },
      },
      required: ['email'],
      additionalProperties: false,
    },
    Timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp (RFC3339)',
      default: '2024-01-01T00:00:00Z',
    },
    UUID: {
      type: 'string',
      format: 'uuid',
      description: 'Universally Unique Identifier (RFC4122)',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
    Severity: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      description: 'Severity level',
      default: 'medium',
    },
    Priority: {
      type: 'string',
      enum: ['P1', 'P2', 'P3', 'P4'],
      description: 'Priority level (P1=Critical, P4=Low)',
      default: 'P4',
    },
    Status: {
      type: 'string',
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      description: 'Status of an item',
      default: 'open',
    },
  },
};
