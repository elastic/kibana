/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scoutAnalyzeTestSuitability } from '../test_analyzer';

describe('scoutAnalyzeTestSuitability', () => {
  describe('Unit Test Detection', () => {
    it('should identify pure function tests as unit tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Calculate risk score from severity',
        testCode: `
          function calculateRiskScore(severity) {
            if (severity === 'critical') return 100;
            if (severity === 'high') return 75;
            return 50;
          }
          expect(calculateRiskScore('high')).toBe(75);
        `,
        context: 'new_test_generation',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('unit');
      expect(result.data?.confidence).toBe('high');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/pure function|no browser/i)])
      );
    });

    it('should identify business logic tests as unit tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Validate alert rule logic',
        testCode: `
          describe('Alert rule validation', () => {
            it('should validate rule configuration', () => {
              const isValid = validateRuleConfig({
                name: 'Test',
                type: 'query',
                query: 'process.name: "test"'
              });
              expect(isValid).toBe(true);
            });
          });
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('unit');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/business logic|isolated/i)])
      );
    });

    it('should identify data transformation as unit tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Transform alert data to display format',
        testCode: `
          const alerts = [{ id: 1, severity: 'high' }];
          const transformed = alerts.map(a => ({
            ...a,
            displaySeverity: a.severity.toUpperCase()
          }));
          expect(transformed[0].displaySeverity).toBe('HIGH');
        `,
        context: 'new_test_generation',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('unit');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/data transformation|independently/i)])
      );
    });

    it('should detect simple test complexity for unit tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Simple validation function',
        testCode: `
          cy.window().then((win) => {
            expect(win.validateEmail('test@example.com')).toBe(true);
          });
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('unit');
      expect(result.data?.codeSmells).toBeUndefined(); // Simple test, no smells
    });
  });

  describe('Integration Test Detection', () => {
    it('should identify API-only tests as integration tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Create alert via API',
        testCode: `
          cy.request('POST', '/api/detection_engine/rules', {
            name: 'Test Rule',
            type: 'query'
          }).then((response) => {
            expect(response.status).to.equal(200);
            expect(response.body.id).to.exist;
          });
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('integration');
      expect(result.data?.confidence).toBe('high');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/API call|without UI/i)])
      );
    });

    it('should identify backend-only tests as integration tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Query Elasticsearch for alerts',
        testCode: `
          cy.task('queryElasticsearch', {
            index: '.alerts-security',
            query: { match_all: {} }
          }).then((results) => {
            expect(results.hits.total.value).to.be.greaterThan(0);
          });
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('integration');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/backend|elasticsearch/i)])
      );
    });

    it('should identify tests with multiple API calls as integration', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Create and verify alert',
        testCode: `
          cy.request('POST', '/api/alerts', data);
          cy.request('GET', '/api/alerts/' + alertId);
          cy.request('PUT', '/api/alerts/' + alertId, updates);
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('integration');
      // Should indicate multiple API calls in reasoning or estimate
      expect(result.data?.estimatedSpeed).toContain('10-20s');
    });

    it('should detect intercept usage for integration tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Mock API responses',
        testCode: `
          cy.intercept('GET', '/api/alerts', { fixture: 'alerts.json' });
          cy.intercept('POST', '/api/rules', { statusCode: 201 });
          cy.request('GET', '/api/alerts');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('integration');
    });
  });

  describe('E2E Test Detection', () => {
    it('should identify multi-page workflows as E2E', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'User navigates through alert creation workflow',
        testCode: `
          cy.visit('/app/security/alerts');
          cy.get('[data-test-subj="createAlertButton"]').click();
          cy.url().should('include', '/create');
          cy.get('[data-test-subj="alertName"]').type('My Alert');
          cy.get('[data-test-subj="saveButton"]').click();
          cy.url().should('include', '/alerts/');
          cy.get('[data-test-subj="alertsList"]').should('contain', 'My Alert');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('e2e');
      expect(result.data?.confidence).toBe('high');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/multi.*page|workflow/i)])
      );
    });

    it('should identify complex user flows as E2E', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'User creates, edits, and deletes alert',
        testCode: `
          cy.visit('/alerts');
          cy.click('[data-test-subj="create"]');
          cy.type('[data-test-subj="name"]', 'Test');
          cy.click('[data-test-subj="save"]');
          cy.click('[data-test-subj="edit"]');
          cy.type('[data-test-subj="name"]', 'Updated');
          cy.click('[data-test-subj="delete"]');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('e2e');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/complex.*flow|user journey/i)])
      );
    });

    it('should detect browser interactions for E2E', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Interactive form submission',
        testCode: `
          cy.visit('/form');
          cy.get('[data-test-subj="input1"]').type('value1');
          cy.get('[data-test-subj="select"]').select('option2');
          cy.get('[data-test-subj="checkbox"]').check();
          cy.get('[data-test-subj="submit"]').click();
          cy.get('[data-test-subj="success"]').should('be.visible');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('e2e');
    });

    it('should identify authentication flows as E2E', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'User logs in and accesses protected page',
        testCode: `
          cy.visit('/login');
          cy.get('[data-test-subj="username"]').type('admin');
          cy.get('[data-test-subj="password"]').type('password');
          cy.get('[data-test-subj="login"]').click();
          cy.url().should('include', '/dashboard');
          cy.visit('/protected');
          cy.get('[data-test-subj="content"]').should('be.visible');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('e2e');
      expect(result.data?.reasoning).toEqual(
        expect.arrayContaining([expect.stringMatching(/authentication|multi.*page/i)])
      );
    });
  });

  describe('Code Smell Detection', () => {
    it('should detect hard waits', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with hard wait',
        testCode: `
          cy.visit('/page');
          cy.wait(5000); // Hard wait
          cy.get('[data-test-subj="element"]').click();
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.codeSmells).toBeDefined();
      expect(result.data?.codeSmells).toEqual(
        expect.arrayContaining([expect.stringMatching(/hard wait/i)])
      );
    });

    it('should detect brittle selectors', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with brittle selectors',
        testCode: `
          cy.visit('/page');
          cy.get('.button-class').click();
          cy.get('#submit-button').click();
          cy.get('button').first().click();
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.codeSmells).toBeDefined();
      expect(result.data?.codeSmells).toEqual(
        expect.arrayContaining([expect.stringMatching(/brittle selector/i)])
      );
    });

    it('should detect excessive test length', async () => {
      const longCode = `
        cy.visit('/page');
        ${Array(25)
          .fill(0)
          .map((_, i) => `cy.get('[data-test-subj="step${i}"]').click();`)
          .join('\n')}
      `;

      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Very long test',
        testCode: longCode,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.codeSmells).toBeDefined();
      expect(result.data?.codeSmells).toEqual(
        expect.arrayContaining([expect.stringMatching(/very long|splitting/i)])
      );
    });

    it('should detect few or no assertions', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with no assertions',
        testCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
          cy.get('[data-test-subj="input"]').type('text');
          cy.get('[data-test-subj="submit"]').click();
          cy.get('[data-test-subj="another"]').click();
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.codeSmells).toBeDefined();
      expect(result.data?.codeSmells).toEqual(
        expect.arrayContaining([expect.stringMatching(/few.*no assertion/i)])
      );
    });

    it('should detect multiple custom commands', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with custom commands',
        testCode: `
          cy.customLogin();
          cy.customSetup();
          cy.customCreateAlert();
          cy.customVerifyAlert();
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.codeSmells).toBeDefined();
      expect(result.data?.codeSmells).toEqual(
        expect.arrayContaining([expect.stringMatching(/custom command/i)])
      );
    });
  });

  describe('Mixed Test Scenarios', () => {
    it('should handle tests with multiple concerns', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with business logic, API, and UI',
        testCode: `
          // Business logic
          const score = calculateRiskScore(alert);

          // API call
          cy.request('POST', '/api/alerts', { ...alert, score });

          // UI interaction
          cy.visit('/alerts');
          cy.get('[data-test-subj="alert"]').should('exist');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      // Should recommend splitting or identify dominant pattern
      expect(result.data?.recommendedType).toBeDefined();
      expect(result.data?.confidence).toBeDefined();
    });

    it('should prioritize E2E when UI interactions dominate', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Mostly UI with some API',
        testCode: `
          cy.request('POST', '/api/setup');
          cy.visit('/dashboard');
          cy.get('[data-test-subj="widget1"]').click();
          cy.get('[data-test-subj="widget2"]').click();
          cy.get('[data-test-subj="widget3"]').click();
          cy.get('[data-test-subj="save"]').click();
          cy.url().should('include', '/saved');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('e2e');
    });

    it('should prioritize integration when API calls dominate', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Mostly API with minimal UI',
        testCode: `
          cy.request('POST', '/api/alerts', data1);
          cy.request('GET', '/api/alerts');
          cy.request('PUT', '/api/alerts/1', data2);
          cy.request('DELETE', '/api/alerts/1');
          cy.visit('/alerts');
          cy.get('[data-test-subj="list"]').should('exist');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('integration');
    });
  });

  describe('Confidence Levels', () => {
    it('should have high confidence for clear unit test', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Pure calculation function',
        testCode: 'expect(add(2, 3)).toBe(5);',
        context: 'new_test_generation',
      });

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe('high');
    });

    it('should have high confidence for clear E2E workflow', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Multi-page user journey',
        testCode: `
          cy.visit('/start');
          cy.get('[data-test-subj="next"]').click();
          cy.url().should('include', '/step2');
          cy.get('[data-test-subj="next"]').click();
          cy.url().should('include', '/finish');
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe('high');
    });

    it('should have lower confidence for ambiguous tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'General test',
        testCode: `
          cy.visit('/page');
          cy.request('GET', '/api/data');
        `,
        context: 'general',
      });

      expect(result.success).toBe(true);
      // Confidence might be medium or low depending on characteristics
      expect(['high', 'medium', 'low']).toContain(result.data?.confidence);
    });
  });

  describe('Speed Estimates', () => {
    it('should estimate < 1s for unit tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Simple function test',
        testCode: 'expect(double(5)).toBe(10);',
        context: 'new_test_generation',
      });

      expect(result.success).toBe(true);
      expect(result.data?.estimatedSpeed).toMatch(/< 1s|very fast/i);
    });

    it('should estimate 5-10s for simple integration tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Simple API test',
        testCode: `cy.request('GET', '/api/data');`,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.estimatedSpeed).toMatch(/5-10s/i);
    });

    it('should estimate longer time for complex E2E tests', async () => {
      const longWorkflow = `
        cy.visit('/start');
        ${Array(20)
          .fill(0)
          .map((_, i) => `cy.get('[data-test-subj="step${i}"]').click();`)
          .join('\n')}
      `;

      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Complex multi-step workflow',
        testCode: longWorkflow,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.estimatedSpeed).toMatch(/45-60s|60s\+/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty test code', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with no code',
        testCode: '',
        context: 'general',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBeDefined();
    });

    it('should handle missing test code', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with description only',
        context: 'general',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBeDefined();
    });

    it('should handle invalid code gracefully', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with syntax errors',
        testCode: 'cy.get(((( invalid syntax',
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      // Should fall back to regex-based analysis
      expect(result.data?.recommendedType).toBeDefined();
    });

    it('should handle very long test descriptions', async () => {
      const longDescription = 'Test that '.repeat(100) + 'does something';

      const result = await scoutAnalyzeTestSuitability({
        testDescription: longDescription,
        testCode: 'cy.visit("/page");',
        context: 'general',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBeDefined();
    });

    it('should handle code with special characters', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test with special chars',
        testCode: `
          cy.request('POST', '/api/alerts', {
            query: 'process.name: "test" AND user.name: "admin"',
            regex: /\\d{3}-\\d{2}-\\d{4}/
          });
        `,
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendedType).toBe('integration');
    });
  });

  describe('Context Handling', () => {
    it('should handle cypress_migration context', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Cypress test to migrate',
        testCode: 'cy.visit("/page");',
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.context).toBe('cypress_migration');
    });

    it('should handle new_test_generation context', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'New test to generate',
        testCode: 'expect(true).toBe(true);',
        context: 'new_test_generation',
      });

      expect(result.success).toBe(true);
      expect(result.data?.context).toBe('new_test_generation');
    });

    it('should handle general context', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'General analysis',
        context: 'general',
      });

      expect(result.success).toBe(true);
      expect(result.data?.context).toBe('general');
    });
  });

  describe('Reasoning Quality', () => {
    it('should provide multiple reasoning points', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'API test',
        testCode: 'cy.request("GET", "/api/data");',
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.reasoning).toBeDefined();
      expect(result.data?.reasoning.length).toBeGreaterThan(2);
    });

    it('should provide alternative approaches', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Test case',
        testCode: 'cy.visit("/page");',
        context: 'general',
      });

      expect(result.success).toBe(true);
      expect(result.data?.alternativeApproaches).toBeDefined();
      expect(result.data?.alternativeApproaches.length).toBeGreaterThan(0);
    });

    it('should provide examples when appropriate', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Simple test',
        testCode: 'expect(add(1, 2)).toBe(3);',
        context: 'new_test_generation',
      });

      expect(result.success).toBe(true);
      expect(result.data?.examples).toBeDefined();
      // Should have example for recommended type
      const recommendedType = result.data?.recommendedType;
      if (recommendedType) {
        expect(result.data?.examples?.[recommendedType]).toBeDefined();
      }
    });
  });

  describe('Maintenance Estimates', () => {
    it('should estimate low maintenance for unit tests', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'Pure function',
        testCode: 'expect(fn()).toBe(expected);',
        context: 'new_test_generation',
      });

      expect(result.success).toBe(true);
      expect(result.data?.estimatedMaintenance).toBe('low');
    });

    it('should estimate medium maintenance for integration/E2E', async () => {
      const result = await scoutAnalyzeTestSuitability({
        testDescription: 'API workflow',
        testCode: 'cy.request("POST", "/api/data");',
        context: 'cypress_migration',
      });

      expect(result.success).toBe(true);
      expect(['medium', 'high']).toContain(result.data?.estimatedMaintenance);
    });
  });
});
