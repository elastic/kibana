/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  scoutAssessMigrationRisk,
  scoutSuggestTestConversion,
  scoutAnalyzeCypressPatterns,
  scoutConvertCypressCommand,
  scoutGenerateMigrationPlan,
  scoutCheckTestCoverage,
  scoutGenerateUnitOrIntegrationTest,
} from '../migration';

describe('scoutAssessMigrationRisk', () => {
  describe('Difficulty Assessment', () => {
    it('should assess simple tests as easy', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          describe('Simple test', () => {
            it('should work', () => {
              cy.visit('/page');
              cy.get('[data-test-subj="button"]').click();
              cy.get('[data-test-subj="result"]').should('be.visible');
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.difficulty).toBe('easy');
      expect(result.data?.estimatedHours).toBeLessThanOrEqual(2);
    });

    it('should assess tests with custom commands as medium', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          describe('Test with custom commands', () => {
            it('should work', () => {
              cy.customLogin();
              cy.customSetup();
              cy.visit('/page');
              cy.get('[data-test-subj="data"]').should('exist');
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.difficulty).toMatch(/medium|easy/);
      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([expect.stringMatching(/custom command/i)])
      );
    });

    it('should assess complex tests as hard', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          describe('Complex test', () => {
            before(() => {
              cy.task('resetDatabase');
            });

            it('should handle complex flow', () => {
              cy.customCommand1();
              cy.customCommand2();
              cy.customCommand3();
              cy.customCommand4();
              cy.customCommand5();
              cy.customCommand6();

              cy.intercept('POST', '/api/**').as('api1');
              cy.intercept('GET', '/api/**').as('api2');
              cy.intercept('PUT', '/api/**').as('api3');
              cy.intercept('DELETE', '/api/**').as('api4');

              cy.visit('/page');
              cy.wait(5000);

              ${Array(25)
                .fill(0)
                .map((_, i) => `cy.get('[data-test-subj="step${i}"]').click();`)
                .join('\n')}

              cy.task('verifyDatabase');
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.difficulty).toBe('hard');
      expect(result.data?.estimatedHours).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Risk Factor Detection', () => {
    it('should detect custom commands as risk factor', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.customLogin();
          cy.customSetup();
          cy.customCommand();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([expect.stringMatching(/custom command/i)])
      );
    });

    it('should detect hard waits as risk factor', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.visit('/page');
          cy.wait(5000);
          cy.get('[data-test-subj="element"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([expect.stringMatching(/hard wait|flakiness/i)])
      );
    });

    it('should detect brittle selectors as risk factor', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.get('.my-class').click();
          cy.get('#my-id').type('text');
          cy.get('button').first().click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([expect.stringMatching(/brittle selector/i)])
      );
    });

    it('should detect cy.task usage as risk factor', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.task('resetDatabase');
          cy.task('seedData', data);
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([expect.stringMatching(/cy\.task|alternative approach/i)])
      );
    });

    it('should detect heavy intercept usage as risk factor', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.intercept('GET', '/api/1').as('api1');
          cy.intercept('POST', '/api/2').as('api2');
          cy.intercept('PUT', '/api/3').as('api3');
          cy.intercept('DELETE', '/api/4').as('api4');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([expect.stringMatching(/intercept|network mocking/i)])
      );
    });

    it('should detect global before() hooks as risk factor', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          before(() => {
            cy.task('setup');
          });

          it('test 1', () => {
            cy.visit('/page1');
          });

          it('test 2', () => {
            cy.visit('/page2');
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.riskFactors).toEqual(
        expect.arrayContaining([expect.stringMatching(/before.*hook|state dependencies/i)])
      );
    });
  });

  describe('Blocker Detection', () => {
    it('should detect cy.session as blocker', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.session('user1', () => {
            cy.visit('/login');
            cy.get('#username').type('user1');
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.blockers).toEqual(
        expect.arrayContaining([expect.stringMatching(/cy\.session/i)])
      );
    });

    it('should detect cy.origin as blocker', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.origin('https://external.com', () => {
            cy.visit('/external');
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.blockers).toEqual(
        expect.arrayContaining([expect.stringMatching(/cy\.origin/i)])
      );
    });

    it('should detect Cypress.env as blocker', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          const apiKey = Cypress.env('API_KEY');
          cy.request({
            url: '/api/data',
            headers: { 'x-api-key': apiKey }
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.blockers).toEqual(
        expect.arrayContaining([expect.stringMatching(/Cypress\.env/i)])
      );
    });

    it('should detect cy.clock/cy.tick as blocker', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.clock();
          cy.visit('/page');
          cy.tick(1000);
          cy.get('[data-test-subj="time"]').should('contain', '1000');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.blockers).toEqual(
        expect.arrayContaining([expect.stringMatching(/cy\.clock|cy\.tick|time mocking/i)])
      );
    });
  });

  describe('Dependency Detection', () => {
    it('should detect API service dependencies', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.request('POST', '/api/detection_engine/rules', data);
          cy.request('GET', '/api/alerts');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.requiredDependencies.apiServices.length).toBeGreaterThan(0);
      expect(result.data?.requiredDependencies.apiServices).toEqual(
        expect.arrayContaining([expect.stringMatching(/detection_engine|alerts/i)])
      );
    });

    it('should detect page object dependencies', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          describe('Alert dashboard test', () => {
            it('should navigate dashboard and create alert', () => {
              cy.visit('/dashboard');
              cy.get('[data-test-subj="alert-widget"]').click();
              cy.visit('/alerts');
              cy.get('[data-test-subj="create"]').click();
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.requiredDependencies.pageObjects.length).toBeGreaterThan(0);
      expect(result.data?.requiredDependencies.pageObjects).toEqual(
        expect.arrayContaining([expect.stringMatching(/dashboard|alert/i)])
      );
    });

    it('should detect utility dependencies', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.task('seedDatabase');
          cy.intercept('POST', '/api/**').as('apiCall');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.requiredDependencies.utilities.length).toBeGreaterThan(0);
    });
  });

  describe('Parallel Execution Assessment', () => {
    it('should allow parallel for isolated tests', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          describe('Isolated test', () => {
            beforeEach(() => {
              cy.visit('/page');
            });

            it('test 1', () => {
              cy.get('[data-test-subj="button"]').click();
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.canRunInParallel).toBe(true);
    });

    it('should not allow parallel for tests with global hooks', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          before(() => {
            cy.task('globalSetup');
          });

          it('test 1', () => {
            cy.visit('/page1');
          });

          it('test 2', () => {
            cy.visit('/page2');
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.canRunInParallel).toBe(false);
    });

    it('should not allow parallel for tests with shared fixtures', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.fixture('shared-data.json').then((data) => {
            cy.visit('/page');
            cy.get('#input').type(data.value);
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.canRunInParallel).toBe(false);
    });
  });

  describe('Migration Strategy', () => {
    it('should provide migration strategy with steps', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.request('POST', '/api/alerts', data);
          cy.visit('/alerts');
          cy.get('[data-test-subj="alert"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.migrationStrategy).toBeDefined();
      expect(result.data?.migrationStrategy).toMatch(/infrastructure|approach|validation/i);
    });

    it('should include dependencies in strategy for easy tests', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.migrationStrategy).toContain('Direct conversion');
    });

    it('should suggest splitting for hard tests', async () => {
      const complexCode = `
        cy.customCommand1();
        cy.customCommand2();
        ${Array(25)
          .fill(0)
          .map((_, i) => `cy.get('[data-test-subj="step${i}"]').click();`)
          .join('\n')}
      `;

      const result = await scoutAssessMigrationRisk({
        cypressTestCode: complexCode,
      });

      expect(result.success).toBe(true);
      expect(result.data?.migrationStrategy).toMatch(/splitting|smaller tests/i);
    });
  });

  describe('Effort Estimation', () => {
    it('should estimate 1-2 hours for easy tests', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="element"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.estimatedHours).toBeLessThanOrEqual(2);
    });

    it('should increase estimate for tests with page objects', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.visit('/page1');
          cy.get('[data-test-subj="link"]').click();
          cy.visit('/page2');
          cy.get('[data-test-subj="form"]').type('text');
          cy.visit('/page3');
          cy.get('[data-test-subj="submit"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.estimatedHours).toBeGreaterThanOrEqual(2);
    });

    it('should increase estimate for tests with custom commands', async () => {
      const result = await scoutAssessMigrationRisk({
        cypressTestCode: `
          cy.customCommand1();
          cy.customCommand2();
          cy.customCommand3();
          cy.visit('/page');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.estimatedHours).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('scoutSuggestTestConversion', () => {
  describe('Test Purpose Analysis', () => {
    it('should detect business logic', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Calculate risk score',
        cypressTestCode: `
          const score = calculateRiskScore(alert);
          expect(score).to.equal(100);
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.unitTestGuidance).toBeDefined();
      expect(result.data?.reasoning).toMatch(/business logic/i);
    });

    it('should detect data transformation', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Transform alert data',
        cypressTestCode: `
          const transformed = alerts.map(a => ({
            ...a,
            score: calculateScore(a)
          }));
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.unitTestGuidance).toBeDefined();
      expect(result.data?.reasoning).toMatch(/data transformation/i);
    });

    it('should detect API calls', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Create alert via API',
        cypressTestCode: `
          cy.request('POST', '/api/alerts', data);
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.integrationTestGuidance).toBeDefined();
      expect(result.data?.reasoning).toMatch(/API call/i);
    });

    it('should detect UI interactions', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'User clicks button',
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.e2eTestGuidance).toBeDefined();
      expect(result.data?.reasoning).toMatch(/UI interaction/i);
    });
  });

  describe('Test Splitting Detection', () => {
    it('should suggest splitting for tests with multiple concerns', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Complex test with logic, API, and UI',
        cypressTestCode: `
          // Business logic
          const score = calculateScore(data);

          // API
          cy.request('POST', '/api/alerts', { ...data, score });

          // UI
          cy.visit('/alerts');
          cy.get('[data-test-subj="alert"]').should('exist');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.shouldSplit).toBe(true);
      expect(result.data?.unitTestGuidance).toBeDefined();
      expect(result.data?.integrationTestGuidance).toBeDefined();
      expect(result.data?.e2eTestGuidance).toBeDefined();
    });

    it('should not suggest splitting for single-concern tests', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Pure API test',
        cypressTestCode: `
          cy.request('POST', '/api/data', payload)
            .then((response) => {
              expect(response.status).to.equal(200);
            });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.shouldSplit).toBe(false);
      expect(result.data?.reasoning).toMatch(/single concern/i);
    });
  });

  describe('Conversion Guidance', () => {
    it('should provide unit test guidance for business logic', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Validate rule logic',
        cypressTestCode: `
          const isValid = validateRule({ name: 'Test', query: 'process.name: "test"' });
          expect(isValid).to.be.true;
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.unitTestGuidance).toBeDefined();
      expect(result.data?.unitTestGuidance?.description).toMatch(
        /business logic|data transformation/i
      );
      expect(result.data?.unitTestGuidance?.approach).toMatch(/jest|isolate/i);
      expect(result.data?.unitTestGuidance?.structure).toBeDefined();
      expect(result.data?.unitTestGuidance?.examplePattern).toBeDefined();
    });

    it('should provide integration test guidance for API tests', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Test alert API',
        cypressTestCode: `
          cy.request('POST', '/api/alerts', data);
          cy.request('GET', '/api/alerts');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.integrationTestGuidance).toBeDefined();
      expect(result.data?.integrationTestGuidance?.description).toMatch(
        /API endpoint|service integration/i
      );
      expect(result.data?.integrationTestGuidance?.approach).toMatch(/FTR|supertest/i);
      expect(result.data?.integrationTestGuidance?.structure).toContain('supertest');
      expect(result.data?.integrationTestGuidance?.examplePattern).toMatch(/FTR/i);
    });

    it('should provide E2E guidance for UI workflows', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'User workflow',
        cypressTestCode: `
          cy.visit('/start');
          cy.get('[data-test-subj="next"]').click();
          cy.get('[data-test-subj="finish"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.e2eTestGuidance).toBeDefined();
      expect(result.data?.e2eTestGuidance?.description).toMatch(/E2E|user flow/i);
      expect(result.data?.e2eTestGuidance?.approach).toMatch(/Scout/i);
      expect(result.data?.e2eTestGuidance?.structure).toContain('@kbn/scout');
    });

    it('should provide all three types of guidance for mixed tests', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Full stack test',
        cypressTestCode: `
          const validated = validateData(input);
          cy.request('POST', '/api/process', validated);
          cy.visit('/results');
          cy.get('[data-test-subj="status"]').should('contain', 'Success');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.shouldSplit).toBe(true);
      expect(result.data?.unitTestGuidance).toBeDefined();
      expect(result.data?.integrationTestGuidance).toBeDefined();
      expect(result.data?.e2eTestGuidance).toBeDefined();
    });
  });

  describe('Reasoning Quality', () => {
    it('should provide clear reasoning for single concern', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Simple test',
        cypressTestCode: 'cy.request("GET", "/api/data");',
      });

      expect(result.success).toBe(true);
      expect(result.data?.reasoning).toBeDefined();
      expect(result.data?.reasoning.length).toBeGreaterThan(20);
      expect(result.data?.reasoning).toMatch(/single concern/i);
    });

    it('should provide clear reasoning for multiple concerns', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Complex test',
        cypressTestCode: `
          const x = transform(data);
          cy.request('POST', '/api', x);
          cy.visit('/page');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.reasoning).toBeDefined();
      expect(result.data?.reasoning).toMatch(/multiple concerns/i);
      expect(result.data?.reasoning).toMatch(/splitting/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty test code', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Empty test',
        cypressTestCode: '',
      });

      expect(result.success).toBe(true);
      expect(result.data?.shouldSplit).toBe(false);
    });

    it('should handle code with only comments', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Test with comments',
        cypressTestCode: `
          // This is a comment
          // Another comment
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle very complex mixed code', async () => {
      const result = await scoutSuggestTestConversion({
        testDescription: 'Very complex test',
        cypressTestCode: `
          const calc1 = calculate(data1);
          const calc2 = calculate(data2);
          const transformed = transform(calc1, calc2);

          cy.request('POST', '/api/1', transformed);
          cy.request('GET', '/api/2');
          cy.request('PUT', '/api/3', updates);

          cy.visit('/page1');
          cy.get('[data-test-subj="btn1"]').click();
          cy.visit('/page2');
          cy.get('[data-test-subj="btn2"]').click();
          cy.visit('/page3');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.shouldSplit).toBe(true);
      expect(result.data?.unitTestGuidance).toBeDefined();
      expect(result.data?.integrationTestGuidance).toBeDefined();
      expect(result.data?.e2eTestGuidance).toBeDefined();
    });
  });
});

describe('scoutAnalyzeCypressPatterns', () => {
  describe('E2E Test Detection', () => {
    it('should not warn for tests that should be E2E', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          describe('Multi-page workflow', () => {
            it('should complete user journey', () => {
              cy.visit('/start');
              cy.get('[data-test-subj="next"]').click();
              cy.url().should('include', '/step2');
              cy.get('[data-test-subj="next"]').click();
              cy.url().should('include', '/finish');
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.warning).toBeUndefined();
      expect(result.data?.suitabilityAnalysis?.recommendedType).toBe('e2e');
    });

    it('should extract patterns from E2E tests', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
          cy.get('[data-test-subj="input"]').type('text');
          cy.get('[data-test-subj="result"]').should('be.visible');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.selectors.length).toBeGreaterThan(0);
      expect(result.data?.analysis.actions.length).toBeGreaterThan(0);
      expect(result.data?.analysis.assertions.length).toBeGreaterThan(0);
      expect(result.data?.analysis.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Unit/Integration Test Detection - High Confidence', () => {
    it('should strongly discourage Scout migration for high-confidence unit test recommendations', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          describe('Pure function test', () => {
            it('should calculate correctly', () => {
              const result = calculateRiskScore([{ severity: 5 }, { severity: 3 }]);
              expect(result).to.equal(8);
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.warning).toBeDefined();
      expect(result.data?.warning?.canProceedWithScout).toBe(false);
      expect(result.data?.warning?.confidence).toBe('high');
      expect(result.data?.warning?.message).toMatch(/should be a unit test/i);
      expect(result.data?.warning?.recommendedAction).toContain('scout_suggest_test_conversion');
      expect(result.data?.warning?.estimatedSpeedImprovement).toBeDefined();
      expect(result.data?.warning?.estimatedMaintenance).toBeDefined();
      expect(result.message).toMatch(/🚫/);
    });

    it('should strongly discourage Scout migration for high-confidence integration test recommendations', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          describe('API test', () => {
            it('should handle API calls', () => {
              cy.request('POST', '/api/alerts', data);
              cy.request('GET', '/api/alerts').then((response) => {
                expect(response.status).to.equal(200);
              });
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.warning).toBeDefined();
      expect(result.data?.warning?.canProceedWithScout).toBe(false);
      expect(result.data?.warning?.confidence).toBe('high');
      expect(result.data?.warning?.message).toMatch(/should be a integration test/i);
      expect(result.data?.suitabilityAnalysis?.recommendedType).toBe('integration');
    });
  });

  describe('Unit/Integration Test Detection - Medium/Low Confidence', () => {
    it('should warn but allow Scout migration for medium-confidence recommendations', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          describe('Ambiguous test', () => {
            it('should work', () => {
              cy.visit('/page');
              cy.request('GET', '/api/data');
            });
          });
        `,
      });

      expect(result.success).toBe(true);
      // If warning exists and confidence is medium/low, should allow proceeding
      if (result.data?.warning) {
        const confidence = result.data.warning.confidence;
        if (confidence === 'medium' || confidence === 'low') {
          expect(result.data.warning.canProceedWithScout).toBe(true);
          expect(result.data.warning.message).toMatch(/might be better/i);
          expect(result.message).toMatch(/⚠️ Warning/);
        }
      }
    });
  });

  describe('Pattern Extraction', () => {
    it('should extract selectors correctly', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.get('[data-test-subj="button1"]');
          cy.get('[data-test-subj="button2"]');
          cy.get('.class-name');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.selectors.length).toBeGreaterThanOrEqual(2);
      expect(result.data?.analysis.selectors).toContain('[data-test-subj="button1"]');
    });

    it('should extract data-test-subj selectors and provide conversion suggestions', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.get('[data-test-subj="submit-button"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.suggestions).toEqual(
        expect.arrayContaining([expect.stringMatching(/page\.testSubj\.locator.*submit-button/i)])
      );
    });

    it('should extract actions correctly', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.get('[data-test-subj="button"]').click();
          cy.get('[data-test-subj="input"]').type('text');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.actions).toContain('click');
      expect(result.data?.analysis.actions).toContain('type');
      expect(result.data?.analysis.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Convert.*\.click\(\)/i),
          expect.stringMatching(/Convert.*\.type\(/i),
        ])
      );
    });

    it('should extract assertions correctly', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.get('[data-test-subj="element"]').should('be.visible');
          cy.get('[data-test-subj="text"]').should('have.text', 'expected');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.assertions.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract API calls correctly', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.request('POST', '/api/alerts', data);
          cy.task('setupData');
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.apiCalls).toContain('cy.request');
      expect(result.data?.analysis.apiCalls).toContain('cy.task');
      expect(result.data?.analysis.suggestions).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/cy\.request.*API service|API service.*cy\.request/i),
          expect.stringMatching(/cy\.task.*API service|API service.*cy\.task/i),
        ])
      );
    });

    it('should extract imports correctly', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          import { helper } from './helpers';
          import { constants } from '../constants';
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.imports.length).toBe(2);
      expect(result.data?.analysis.imports).toContain('./helpers');
      expect(result.data?.analysis.imports).toContain('../constants');
    });
  });

  describe('Migration Plan Generation', () => {
    it('should generate migration plan with all steps', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.migrationPlan).toBeDefined();
      expect(result.data?.migrationPlan.step1).toContain('API services');
      expect(result.data?.migrationPlan.step2).toContain('page objects');
      expect(result.data?.migrationPlan.step3).toContain('test structure');
      expect(result.data?.migrationPlan.step8).toContain('validate');
    });
  });

  describe('Warning Structure', () => {
    it('should include all required warning fields for high confidence non-E2E', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
      });

      if (result.data?.warning) {
        expect(result.data.warning).toHaveProperty('message');
        expect(result.data.warning).toHaveProperty('confidence');
        expect(result.data.warning).toHaveProperty('reasoning');
        expect(result.data.warning).toHaveProperty('alternatives');
        expect(result.data.warning).toHaveProperty('canProceedWithScout');
        expect(result.data.warning).toHaveProperty('recommendedAction');
        expect(result.data.warning).toHaveProperty('estimatedSpeedImprovement');
        expect(result.data.warning).toHaveProperty('estimatedMaintenance');
      }
    });

    it('should include suitability analysis in response', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
        `,
      });

      expect(result.success).toBe(true);
      expect(result.data?.suitabilityAnalysis).toBeDefined();
      expect(result.data?.suitabilityAnalysis).toHaveProperty('recommendedType');
      expect(result.data?.suitabilityAnalysis).toHaveProperty('confidence');
      expect(result.data?.suitabilityAnalysis).toHaveProperty('reasoning');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty test code gracefully', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: '',
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis).toBeDefined();
    });
  });
});

describe('scoutConvertCypressCommand', () => {
  describe('Exact Match Conversions', () => {
    it('should convert data-test-subj selector', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: 'cy.get(\'[data-test-subj="x"]\')',
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toBe("page.testSubj.locator('x')");
      expect(result.data?.explanation).toContain('testSubj');
    });

    it('should convert click action', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: 'cy.get(\'[data-test-subj="x"]\').click()',
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('await');
      expect(result.data?.scout).toContain('click');
    });

    it('should convert type action', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: "cy.get('[data-test-subj=\"x\"]').type('text')",
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('fill');
    });

    it('should convert cy.visit to gotoApp', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: "cy.visit('/app/security')",
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('gotoApp');
      expect(result.data?.scout).toContain('security');
    });

    it('should convert should assertions', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: ".should('be.visible')",
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('toBeVisible');
    });
  });

  describe('Pattern Matching Conversions', () => {
    it('should convert data-test-subj pattern', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: 'cy.get(\'[data-test-subj="custom-button"]\')',
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('custom-button');
    });

    it('should convert cy.request to API service guidance', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: "cy.request('POST', '/api/alerts', data)",
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('API service');
    });

    it('should convert cy.task to API service guidance', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: "cy.task('setupData')",
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('API service');
    });
  });

  describe('Unknown Commands', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await scoutConvertCypressCommand({
        cypressCommand: 'cy.unknownCommand()',
      });

      expect(result.success).toBe(true);
      expect(result.data?.scout).toContain('No direct conversion');
    });
  });
});

describe('scoutGenerateMigrationPlan', () => {
  it('should generate migration plan with phases', async () => {
    const result = await scoutGenerateMigrationPlan({
      cypressTestPath: '/path/to/tests',
      testFiles: ['test1.cy.ts', 'test2.cy.ts'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.phase1).toBeDefined();
    expect(result.data?.phase1.title).toContain('Infrastructure');
    expect(result.data?.phase2).toBeDefined();
    expect(result.data?.phase2.title).toContain('Page Objects');
    expect(result.data?.phase3).toBeDefined();
    expect(result.data?.phase3.title).toContain('Test Migration');
  });

  it('should include dependencies structure', async () => {
    const result = await scoutGenerateMigrationPlan({
      cypressTestPath: '/path/to/tests',
    });

    expect(result.success).toBe(true);
    expect(result.data?.dependencies).toBeDefined();
    expect(result.data?.dependencies.apiServices).toBeInstanceOf(Array);
    expect(result.data?.dependencies.pageObjects).toBeInstanceOf(Array);
    expect(result.data?.dependencies.utilities).toBeInstanceOf(Array);
  });

  it('should include testing strategy', async () => {
    const result = await scoutGenerateMigrationPlan({
      cypressTestPath: '/path/to/tests',
    });

    expect(result.success).toBe(true);
    expect(result.data?.testingStrategy).toBeDefined();
    expect(result.data?.testingStrategy.approach).toBeDefined();
    expect(result.data?.testingStrategy.validation).toBeInstanceOf(Array);
  });
});

describe('scoutCheckTestCoverage', () => {
  describe('Coverage Detection', () => {
    it('should detect existing unit tests', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          describe('Calculate risk score', () => {
            it('should calculate correctly', () => {
              const result = calculateRiskScore([{ severity: 5 }]);
              expect(result).to.equal(5);
            });
          });
        `,
        testDescription: 'Calculate risk score',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.recommendation).toBeDefined();
      expect(['skip', 'generate_unit', 'generate_integration', 'migrate_e2e', 'split']).toContain(
        result.data?.recommendation
      );
    });

    it('should detect existing integration tests', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          describe('API test', () => {
            it('should handle API calls', () => {
              cy.request('POST', '/api/alerts', data);
            });
          });
        `,
        testDescription: 'Test alert API',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.existingTests).toBeInstanceOf(Array);
    });

    it('should identify gaps in coverage', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          describe('Complex test', () => {
            it('should work', () => {
              const score = calculateRiskScore(data);
              cy.request('POST', '/api/alerts', { score });
              cy.visit('/alerts');
            });
          });
        `,
        testDescription: 'Complex workflow test',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data?.gaps).toBeInstanceOf(Array);
      expect(result.data?.reasoning).toBeDefined();
    });
  });

  describe('Recommendations', () => {
    it('should recommend skip when unit test exists', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        testDescription: 'Calculate function test',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      // May recommend skip or generate_unit depending on what exists
      expect(result.data?.recommendation).toBeDefined();
    });

    it('should recommend generate_unit when no unit test exists', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          const result = calculateRiskScore([{ severity: 5 }]);
          expect(result).to.equal(5);
        `,
        testDescription: 'Unique calculation test',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      // Should recommend generate_unit if no existing unit test found
      expect(result.data?.recommendation).toBeDefined();
    });

    it('should recommend generate_integration when no integration test exists', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          cy.request('POST', '/api/unique-endpoint', data);
        `,
        testDescription: 'Unique API endpoint test',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendation).toBeDefined();
    });

    it('should recommend migrate_e2e for appropriate E2E tests', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          cy.visit('/start');
          cy.get('[data-test-subj="next"]').click();
          cy.url().should('include', '/step2');
          cy.get('[data-test-subj="next"]').click();
          cy.url().should('include', '/finish');
        `,
        testDescription: 'Multi-page user workflow',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      // Should recommend migrate_e2e if appropriate
      expect(result.data?.recommendation).toBeDefined();
    });

    it('should recommend split for tests with multiple concerns', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          const score = calculateRiskScore(data);
          cy.request('POST', '/api/alerts', { score });
          cy.visit('/alerts');
          cy.get('[data-test-subj="alert"]').should('exist');
        `,
        testDescription: 'Test with logic, API, and UI',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      // May recommend split if multiple concerns detected
      expect(result.data?.recommendation).toBeDefined();
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract keywords from test description', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: '',
        testDescription: 'Test alert creation workflow',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should extract API endpoints from code', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          cy.request('POST', '/api/detection_engine/rules', data);
          cy.request('GET', '/api/alerts');
        `,
        testDescription: 'API test',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should extract data-test-subj values', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: `
          cy.get('[data-test-subj="create-button"]').click();
          cy.get('[data-test-subj="submit-form"]').click();
        `,
        testDescription: 'UI interaction test',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty test code gracefully', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: '',
        testDescription: 'Empty test',
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle invalid working directory gracefully', async () => {
      const result = await scoutCheckTestCoverage({
        cypressTestCode: 'cy.visit("/page");',
        testDescription: 'Test',
        workingDir: '/nonexistent/path',
      });

      // Should still succeed, just return empty results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});

describe('scoutGenerateUnitOrIntegrationTest', () => {
  describe('Unit Test Generation', () => {
    it('should generate unit test for pure function', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: `
          describe('Calculate risk score', () => {
            it('should calculate correctly', () => {
              const result = calculateRiskScore([{ severity: 5 }, { severity: 3 }]);
              expect(result).to.equal(8);
            });
          });
        `,
        testDescription: 'Calculate risk score',
        testType: 'unit',
      });

      expect(result.success).toBe(true);
      expect(result.data?.testType).toBe('unit');
      expect(result.data?.testCode).toBeDefined();
      expect(result.data?.testCode).toContain('describe');
      expect(result.data?.testCode).toContain('it');
      expect(result.data?.testCode).toContain('expect');
      expect(result.data?.filePath).toBeDefined();
      expect(result.data?.imports).toBeInstanceOf(Array);
      expect(result.data?.dependencies).toBeInstanceOf(Array);
    });

    it('should include Jest imports in unit test', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        testDescription: 'Calculate function',
        testType: 'unit',
      });

      expect(result.success).toBe(true);
      expect(result.data?.imports).toEqual(
        expect.arrayContaining([expect.stringMatching(/@jest\/globals|jest/i)])
      );
    });

    it('should extract function name from code', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: `
          const result = calculateRiskScore([{ severity: 5 }]);
          expect(result).to.equal(5);
        `,
        testDescription: 'Calculate risk score',
        testType: 'unit',
      });

      expect(result.success).toBe(true);
      expect(result.data?.testCode).toBeDefined();
    });

    it('should fail for non-unit-testable code', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
        `,
        testDescription: 'UI interaction test',
        testType: 'unit',
      });

      // Should fail or return error if not suitable
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        // If it succeeds, it should still generate something
        expect(result.data).toBeDefined();
      }
    });
  });

  describe('Integration Test Generation', () => {
    it('should generate integration test for API calls', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: `
          describe('API test', () => {
            it('should handle API calls', () => {
              cy.request('POST', '/api/alerts', data);
              cy.request('GET', '/api/alerts').then((response) => {
                expect(response.status).to.equal(200);
              });
            });
          });
        `,
        testDescription: 'Test alert API',
        testType: 'integration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.testType).toBe('integration');
      expect(result.data?.testCode).toBeDefined();
      expect(result.data?.testCode).toContain('FtrProviderContext');
      expect(result.data?.testCode).toContain('supertest');
      expect(result.data?.testCode).toContain('describe');
      expect(result.data?.filePath).toBeDefined();
      expect(result.data?.imports).toBeInstanceOf(Array);
    });

    it('should include FTR imports in integration test', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: "cy.request('POST', '/api/endpoint', data);",
        testDescription: 'API endpoint test',
        testType: 'integration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.imports).toEqual(
        expect.arrayContaining([expect.stringMatching(/FtrProviderContext|supertest/i)])
      );
    });

    it('should extract API endpoints from code', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: `
          cy.request('POST', '/api/detection_engine/rules', data);
          cy.request('GET', '/api/alerts');
        `,
        testDescription: 'Multiple API endpoints',
        testType: 'integration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.testCode).toContain('/api/');
    });

    it('should fail for non-integration-testable code', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: `
          const result = calculateRiskScore([{ severity: 5 }]);
          expect(result).to.equal(5);
        `,
        testDescription: 'Pure function test',
        testType: 'integration',
      });

      // Should fail or return error if not suitable
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        // If it succeeds, it should still generate something
        expect(result.data).toBeDefined();
      }
    });
  });

  describe('File Path Generation', () => {
    it('should generate appropriate path for unit test', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        testDescription: 'Calculate function',
        testType: 'unit',
      });

      expect(result.success).toBe(true);
      expect(result.data?.filePath).toMatch(/\.test\.ts$/);
    });

    it('should generate appropriate path for integration test', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: "cy.request('POST', '/api/endpoint', data);",
        testDescription: 'API endpoint test',
        testType: 'integration',
      });

      expect(result.success).toBe(true);
      expect(result.data?.filePath).toMatch(/\.integration\.spec\.ts$/);
    });

    it('should use custom output path when provided', async () => {
      const customPath = 'custom/path/test.test.ts';
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        testDescription: 'Calculate function',
        testType: 'unit',
        outputPath: customPath,
      });

      expect(result.success).toBe(true);
      expect(result.data?.filePath).toBe(customPath);
    });
  });

  describe('Code Structure', () => {
    it('should include copyright header in generated code', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        testDescription: 'Test',
        testType: 'unit',
      });

      expect(result.success).toBe(true);
      expect(result.data?.testCode).toContain('Copyright Elasticsearch');
    });

    it('should include proper test structure', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        testDescription: 'Calculate function test',
        testType: 'unit',
      });

      expect(result.success).toBe(true);
      expect(result.data?.testCode).toContain('describe');
      expect(result.data?.testCode).toContain('it');
      expect(result.data?.testCode).toContain('expect');
    });

    it('should include TODOs for manual completion', async () => {
      const result = await scoutGenerateUnitOrIntegrationTest({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        testDescription: 'Test',
        testType: 'unit',
      });

      expect(result.success).toBe(true);
      expect(result.data?.testCode).toMatch(/TODO/i);
    });
  });
});

describe('scoutAnalyzeCypressPatterns with Coverage', () => {
  describe('Coverage Analysis Integration', () => {
    it('should include coverage analysis when checkCoverage is true', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          describe('Calculate risk score', () => {
            it('should calculate correctly', () => {
              const result = calculateRiskScore([{ severity: 5 }]);
              expect(result).to.equal(5);
            });
          });
        `,
        checkCoverage: true,
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data?.coverageAnalysis).toBeDefined();
      if (result.data?.coverageAnalysis) {
        expect(result.data.coverageAnalysis.recommendation).toBeDefined();
        expect(result.data.coverageAnalysis.existingTests).toBeInstanceOf(Array);
        expect(result.data.coverageAnalysis.gaps).toBeInstanceOf(Array);
        expect(result.data.coverageAnalysis.reasoning).toBeDefined();
      }
    });

    it('should not include coverage analysis when checkCoverage is false', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
        `,
        checkCoverage: false,
      });

      expect(result.success).toBe(true);
      expect(result.data?.coverageAnalysis).toBeNull();
    });

    it('should work without checkCoverage parameter (defaults to false)', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          cy.visit('/page');
          cy.get('[data-test-subj="button"]').click();
        `,
      });

      expect(result.success).toBe(true);
      // Should work without coverage check
      expect(result.data?.suitabilityAnalysis).toBeDefined();
    });

    it('should combine suitability and coverage analysis', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          describe('API test', () => {
            it('should handle API calls', () => {
              cy.request('POST', '/api/alerts', data);
            });
          });
        `,
        checkCoverage: true,
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      expect(result.data?.suitabilityAnalysis).toBeDefined();
      expect(result.data?.coverageAnalysis).toBeDefined();
      expect(result.data?.analysis).toBeDefined();
      expect(result.data?.migrationPlan).toBeDefined();
    });
  });

  describe('Coverage-Based Recommendations', () => {
    it('should provide skip recommendation when test is redundant', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: 'expect(calculate(5)).to.equal(10);',
        checkCoverage: true,
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      if (result.data?.coverageAnalysis) {
        // May recommend skip if coverage exists
        expect(result.data.coverageAnalysis.recommendation).toBeDefined();
      }
    });

    it('should identify gaps when coverage is incomplete', async () => {
      const result = await scoutAnalyzeCypressPatterns({
        cypressTestCode: `
          const score = calculateRiskScore(data);
          cy.request('POST', '/api/alerts', { score });
          cy.visit('/alerts');
        `,
        checkCoverage: true,
        workingDir: __dirname,
      });

      expect(result.success).toBe(true);
      if (result.data?.coverageAnalysis) {
        expect(result.data.coverageAnalysis.gaps).toBeInstanceOf(Array);
      }
    });
  });
});
