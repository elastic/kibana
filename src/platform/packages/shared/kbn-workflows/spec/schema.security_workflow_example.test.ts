/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeInputsToJsonSchema } from './lib/input_conversion';
import { WorkflowSchema } from './schema';

/**
 * Security-themed workflow showcasing JSON Schema inputs
 * This workflow demonstrates threat intelligence enrichment and incident response
 */
describe('Security Workflow Example - JSON Schema Showcase', () => {
  it('should parse and validate the security workflow with JSON Schema inputs', () => {
    const workflow = {
      version: '1',
      name: 'Threat Intelligence Enrichment & Incident Response',
      description: 'Enriches threat indicators and creates incident response tickets',
      enabled: true,
      triggers: [{ type: 'manual' }],
      inputs: {
        properties: {
          // Security analyst information with email format
          analyst: {
            type: 'object',
            description: 'Security analyst handling the incident',
            properties: {
              email: {
                type: 'string',
                format: 'email',
                description: 'Analyst email address',
              },
              name: {
                type: 'string',
                minLength: 2,
                maxLength: 100,
                description: 'Analyst full name',
              },
              team: {
                type: 'string',
                enum: ['SOC', 'Threat Intelligence', 'Incident Response', 'Forensics'],
                description: 'Security team',
              },
            },
            required: ['email', 'name', 'team'],
            additionalProperties: false,
          },
          // Threat indicator with regex pattern for IP address
          threatIndicator: {
            type: 'object',
            description: 'Threat indicator to investigate',
            properties: {
              type: {
                type: 'string',
                enum: ['ip', 'domain', 'hash', 'url', 'email'],
                description: 'Type of threat indicator',
              },
              value: {
                type: 'string',
                description: 'The indicator value',
              },
              // IP address with regex pattern validation
              ipAddress: {
                type: 'string',
                pattern:
                  '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
                description: 'IPv4 address (if type is ip)',
              },
              // CVE ID with regex pattern
              cveId: {
                type: 'string',
                pattern: '^CVE-\\d{4}-\\d{4,}$',
                description: 'CVE identifier (e.g., CVE-2024-1234)',
              },
              firstSeen: {
                type: 'string',
                format: 'date-time',
                description: 'When the indicator was first observed',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                default: 'medium',
                description: 'Threat severity level',
              },
            },
            required: ['type', 'value', 'severity'],
            additionalProperties: false,
          },
          // Incident metadata with nested objects
          incidentMetadata: {
            type: 'object',
            description: 'Incident response metadata',
            properties: {
              incidentId: {
                type: 'string',
                pattern: '^INC-\\d{8}-\\d{4}$',
                description: 'Incident ID (format: INC-YYYYMMDD-####)',
              },
              source: {
                type: 'string',
                enum: ['SIEM Alert', 'Threat Intelligence Feed', 'Manual Report', 'EDR Detection'],
                description: 'Source of the incident',
              },
              affectedSystems: {
                type: 'array',
                items: {
                  type: 'string',
                },
                minItems: 1,
                maxItems: 50,
                uniqueItems: true,
                description: 'List of affected system hostnames or IPs',
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: [
                    'malware',
                    'phishing',
                    'ransomware',
                    'apt',
                    'botnet',
                    'c2',
                    'data-exfiltration',
                  ],
                },
                minItems: 1,
                maxItems: 10,
                uniqueItems: true,
                description: 'Incident classification tags',
              },
              enrichment: {
                type: 'object',
                description: 'Threat intelligence enrichment data',
                properties: {
                  reputation: {
                    type: 'string',
                    enum: ['unknown', 'clean', 'suspicious', 'malicious'],
                    default: 'unknown',
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Confidence score (0-100)',
                  },
                  threatActors: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'Associated threat actor groups',
                  },
                  iocs: {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    description: 'Additional indicators of compromise',
                  },
                },
                additionalProperties: false,
              },
            },
            required: ['incidentId', 'source'],
            additionalProperties: false,
          },
          // Response actions
          responseActions: {
            type: 'object',
            description: 'Automated response actions to take',
            properties: {
              blockIndicator: {
                type: 'boolean',
                default: false,
                description: 'Block the threat indicator in firewall/IDS',
              },
              quarantineHosts: {
                type: 'boolean',
                default: false,
                description: 'Quarantine affected hosts',
              },
              createTicket: {
                type: 'boolean',
                default: true,
                description: 'Create incident response ticket',
              },
              notifyTeams: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['SOC', 'Management', 'Legal', 'Compliance'],
                },
                description: 'Teams to notify',
              },
            },
            required: ['createTicket'],
            additionalProperties: false,
          },
          // Priority level
          priority: {
            type: 'string',
            enum: ['P1', 'P2', 'P3', 'P4'],
            default: 'P2',
            description: 'Incident priority (P1=Critical, P4=Low)',
          },
        },
        required: ['analyst', 'threatIndicator', 'incidentMetadata'],
        additionalProperties: false,
      },
      steps: [
        {
          name: 'enrich-threat-indicator',
          type: 'console',
          with: {
            message:
              'Enriching threat indicator: {{ inputs.threatIndicator.value }} (Type: {{ inputs.threatIndicator.type }}, Severity: {{ inputs.threatIndicator.severity }})',
          },
        },
        {
          name: 'create-incident-ticket',
          type: 'console',
          with: {
            message:
              'Creating incident ticket {{ inputs.incidentMetadata.incidentId }} for analyst {{ inputs.analyst.name }} ({{ inputs.analyst.email }})',
          },
        },
        {
          name: 'execute-response-actions',
          type: 'console',
          with: {
            message:
              'Executing response actions: Block={{ inputs.responseActions.blockIndicator }}, Quarantine={{ inputs.responseActions.quarantineHosts }}, Notify={{ inputs.responseActions.notifyTeams }}',
          },
        },
      ],
    };

    // Test 1: Parse the workflow
    const parseResult = WorkflowSchema.safeParse(workflow);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) {
      return;
    }

    const parsedWorkflow = parseResult.data;

    // Test 2: Verify all JSON Schema features are present
    expect(parsedWorkflow.inputs?.properties?.analyst.properties?.email.format).toBe('email');
    expect(
      parsedWorkflow.inputs?.properties?.threatIndicator.properties?.ipAddress.pattern
    ).toBeDefined();
    expect(parsedWorkflow.inputs?.properties?.threatIndicator.properties?.cveId.pattern).toBe(
      '^CVE-\\d{4}-\\d{4,}$'
    );
    expect(parsedWorkflow.inputs?.properties?.threatIndicator.properties?.firstSeen.format).toBe(
      'date-time'
    );
    expect(parsedWorkflow.inputs?.properties?.incidentMetadata.properties?.incidentId.pattern).toBe(
      '^INC-\\d{8}-\\d{4}$'
    );
    expect(
      parsedWorkflow.inputs?.properties?.incidentMetadata.properties?.affectedSystems.minItems
    ).toBe(1);
    expect(parsedWorkflow.inputs?.properties?.incidentMetadata.properties?.tags.uniqueItems).toBe(
      true
    );
    expect(
      parsedWorkflow.inputs?.properties?.incidentMetadata.properties?.enrichment.properties
        ?.confidence.minimum
    ).toBe(0);
    expect(
      parsedWorkflow.inputs?.properties?.incidentMetadata.properties?.enrichment.properties
        ?.confidence.maximum
    ).toBe(100);

    // Test 3: Verify normalization works
    const normalizedInputs = normalizeInputsToJsonSchema(parsedWorkflow.inputs);
    expect(normalizedInputs).toBeDefined();
    expect(normalizedInputs?.properties?.analyst.properties?.email.format).toBe('email');
  });
});
