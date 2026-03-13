/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-nocheck
/* eslint-disable @kbn/eslint/require-license-header, no-restricted-syntax */

/**
 * SLO Demo Data Generator
 *
 * Creates sample SLOs organized hierarchically for the ING Bank demo
 *
 * Usage:
 *   node scripts/slo_demo_data_generator.js --kibanaUrl http://localhost:5601
 */

require('../src/setup_node_env');

const { run } = require('@kbn/dev-cli-runner');
const axios = require('axios');

class DemoDataGenerator {
  constructor(kibanaUrl, log, auth) {
    this.log = log;

    this.client = axios.create({
      baseURL: kibanaUrl,
      ...(auth && { auth }),
      headers: {
        'kbn-xsrf': 'true',
        'Content-Type': 'application/json',
      },
    });
  }

  async createSLO(slo) {
    try {
      const response = await this.client.post('/api/observability/slos', slo);
      this.log.success(`✓ Created SLO: ${slo.name}`);
      return response.data;
    } catch (error) {
      this.log.error(`✗ Failed to create SLO ${slo.name}: ${error.message}`);
      // Don't throw - continue with other SLOs
      return null;
    }
  }

  async generateDemoData() {
    this.log.info('\n🏦 Generating ING Bank Demo SLOs...\n');

    const slos = this.buildDemoSLOs();

    this.log.info(`Creating ${slos.length} SLOs across 3 value streams...\n`);

    let created = 0;
    let failed = 0;

    for (const slo of slos) {
      const result = await this.createSLO(slo);
      if (result) {
        created++;
      } else {
        failed++;
      }
      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.log.info('\n📊 Demo Data Generation Summary:');
    this.log.success(`✓ Successfully created: ${created} SLOs`);
    if (failed > 0) {
      this.log.error(`✗ Failed: ${failed} SLOs`);
    }

    this.log.info('\n💡 Next Steps:');
    this.log.info('1. Navigate to Observability → SLOs');
    this.log.info('2. Switch to "Hierarchical View" to see the organization');
    this.log.info('3. Explore value streams → business components → services');
    this.log.info('4. Use the Executive Report for leadership overview\n');
  }

  buildDemoSLOs() {
    const slos = [];

    // Value Stream 1: Customer Onboarding
    slos.push(
      ...this.buildValueStream('customer-onboarding', [
        {
          businessComponent: 'identity-verification',
          services: [
            { name: 'id-scanner-api', target: 0.985, description: 'Document scanning service' },
            {
              name: 'document-validator',
              target: 0.882,
              description: 'AI-powered document validation',
            },
            {
              name: 'fraud-check-service',
              target: 0.961,
              description: 'Real-time fraud detection',
            },
          ],
        },
        {
          businessComponent: 'account-creation',
          services: [
            { name: 'account-api', target: 0.991, description: 'Account management API' },
            { name: 'database-service', target: 0.982, description: 'Core database operations' },
            { name: 'email-service', target: 0.961, description: 'Email notification service' },
          ],
        },
        {
          businessComponent: 'funding',
          services: [
            { name: 'payment-gateway', target: 0.992, description: 'Payment processing gateway' },
            {
              name: 'bank-integration',
              target: 0.97,
              description: 'External bank integration',
            },
          ],
        },
      ])
    );

    // Value Stream 2: Digital Banking
    slos.push(
      ...this.buildValueStream('digital-banking', [
        {
          businessComponent: 'transaction-processing',
          services: [
            { name: 'transaction-api', target: 0.995, description: 'Transaction processing API' },
            { name: 'ledger-service', target: 0.988, description: 'Ledger management' },
            {
              name: 'notification-service',
              target: 0.955,
              description: 'Transaction notifications',
            },
          ],
        },
        {
          businessComponent: 'account-management',
          services: [
            { name: 'balance-service', target: 0.998, description: 'Real-time balance queries' },
            { name: 'statement-generator', target: 0.945, description: 'Statement generation' },
          ],
        },
      ])
    );

    // Value Stream 3: Lending Platform
    slos.push(
      ...this.buildValueStream('lending-platform', [
        {
          businessComponent: 'loan-origination',
          services: [
            { name: 'application-api', target: 0.99, description: 'Loan application API' },
            {
              name: 'credit-scoring-engine',
              target: 0.92,
              description: 'ML credit scoring',
            },
            {
              name: 'decision-engine',
              target: 0.965,
              description: 'Automated decision making',
            },
          ],
        },
        {
          businessComponent: 'loan-servicing',
          services: [
            { name: 'repayment-service', target: 0.992, description: 'Payment processing' },
            { name: 'interest-calculator', target: 0.978, description: 'Interest calculations' },
          ],
        },
      ])
    );

    return slos;
  }

  buildValueStream(valueStreamName, businessComponents) {
    const slos = [];

    businessComponents.forEach(({ businessComponent, services }) => {
      services.forEach(({ name, target, description }) => {
        slos.push({
          name: `${valueStreamName}-${businessComponent}-${name}`,
          description,
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: 'kbn-data-forge-fake_stack.admin-console-*',
              good: 'http.response.status_code < 500',
              total: 'http.response.status_code: *',
              timestampField: '@timestamp',
            },
          },
          timeWindow: {
            duration: '30d',
            type: 'rolling',
          },
          budgetingMethod: 'occurrences',
          objective: {
            target,
          },
          tags: [
            `value-stream:${valueStreamName}`,
            `business-component:${businessComponent}`,
            `service:${name}`,
            'demo',
            'production',
            'ing-bank-demo',
          ],
        });
      });
    });

    return slos;
  }
}

run(
  async ({ flags, log }) => {
    const kibanaUrl = flags.kibanaUrl || 'http://localhost:5601';
    const username = flags.username;
    const password = flags.password;

    log.info('SLO Demo Data Generator');
    log.info('=======================\n');
    log.info(`Kibana URL: ${kibanaUrl}\n`);

    const auth = username && password ? { username, password } : undefined;
    const generator = new DemoDataGenerator(kibanaUrl, log, auth);

    await generator.generateDemoData();

    log.success('\n✅ Demo data generation completed!');
    log.info('\n🎯 You can now view the hierarchical SLO organization in Kibana\n');
  },
  {
    description: `
      Generate demo SLO data for ING Bank hierarchy demonstration
      
      Creates sample SLOs organized by:
      - Value Streams (Customer Onboarding, Digital Banking, Lending)
      - Business Components (Identity Verification, Transaction Processing, etc.)
      - Services (APIs, databases, integrations)
    `,
    flags: {
      string: ['kibanaUrl', 'username', 'password'],
      default: {
        kibanaUrl: 'http://localhost:5601',
      },
      help: `
        --kibanaUrl    Kibana URL (default: http://localhost:5601)
        --username     Username for authentication
        --password     Password for authentication
      `,
    },
  }
);
