/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { callLLM } from './llm_client';
import { getAllExamples, getExamplesByCategory } from './test_examples';

export interface PluginDetails {
  path: string;
  purpose: string;
  features: string[];
  testTypes: string[];
  complexity: 'simple' | 'medium' | 'complex';
  userInteractions: string[];
  apiEndpoints: string[];
  supportsSpaces: boolean;
  useParallelTesting: boolean;
}

export interface PluginAnalysis {
  summary: string;
  category: string;
  estimatedUseCases: string[];
  technicalComponents: string[];
  riskAreas: string[];
}

export interface TestPlan {
  testType: 'ui' | 'api';
  scenarios: TestScenario[];
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TestScenario {
  name: string;
  description: string;
  steps: string[];
  expectedOutcome: string;
  testCategory: string;
}

export class MultiStepTestGenerator {
  constructor(private model: string = 'codellama') {}

  async analyzePlugin(pluginDetails: PluginDetails, pluginMeta: any): Promise<PluginAnalysis> {
    const prompt = `
You are an expert Kibana plugin analyst. Based on the provided information, analyze this Kibana plugin thoroughly.

Plugin Information:
- Name: ${pluginMeta?.plugin?.id || 'Unknown'}
- Purpose: ${pluginDetails.purpose}
- Features: ${pluginDetails.features.join(', ')}
- Complexity: ${pluginDetails.complexity}
- User Interactions: ${pluginDetails.userInteractions.join(', ')}
- API Endpoints: ${pluginDetails.apiEndpoints.join(', ')}

Instructions:
1. Use your knowledge of Kibana ecosystem and Elastic Stack to provide insights
2. Consider typical patterns for this type of plugin based on Elastic's documentation
3. Identify the plugin category carefully based on purpose and features:
   - "Console" for Elasticsearch query tools, Dev Tools, API testing interfaces
   - "Dashboard" for data visualization and dashboard management
   - "Data" for data management, indexing, search functionality
   - "Security" for authentication, authorization, user management
   - "Management" for settings, configuration, administration
   - "Monitoring" for observability, metrics, alerting
   - "Visualization" for charts, graphs, visual analytics
4. Pay special attention to keywords like "Dev Tools", "Console", "Elasticsearch query", "API calls"
5. Estimate common use cases users would have with this plugin
6. Identify technical components that would likely be involved
7. Highlight potential risk areas that need thorough testing

Please provide your analysis in the following JSON format:
{
  "summary": "Brief 2-3 sentence summary of what this plugin does",
  "category": "Primary category (Console/Dashboard/Data/Security/Management/Monitoring/Visualization)",
  "estimatedUseCases": ["use case 1", "use case 2", "..."],
  "technicalComponents": ["component 1", "component 2", "..."],
  "riskAreas": ["risk area 1", "risk area 2", "..."]
}

Respond with only the JSON object, no additional text.`;

    try {
      const response = await callLLM(this.model, prompt);
      return JSON.parse(response.trim());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error analyzing plugin:', error);
      // Return fallback analysis with better category detection
      let fallbackCategory = 'Data';
      const purpose = pluginDetails.purpose.toLowerCase();
      if (
        purpose.includes('console') ||
        purpose.includes('dev tools') ||
        purpose.includes('elasticsearch query')
      ) {
        fallbackCategory = 'Console';
      } else if (purpose.includes('dashboard') || purpose.includes('visualization')) {
        fallbackCategory = 'Dashboard';
      } else if (purpose.includes('security') || purpose.includes('auth')) {
        fallbackCategory = 'Security';
      } else if (purpose.includes('management') || purpose.includes('settings')) {
        fallbackCategory = 'Management';
      }

      return {
        summary: `${pluginDetails.purpose} plugin for Kibana`,
        category: fallbackCategory,
        estimatedUseCases: pluginDetails.features,
        technicalComponents: ['UI Components', 'API Endpoints'],
        riskAreas: ['User input validation', 'Data handling'],
      };
    }
  }

  async generateTestPlan(
    pluginDetails: PluginDetails,
    analysis: PluginAnalysis,
    testType: 'ui' | 'api'
  ): Promise<TestPlan> {
    const prompt = `
You are an expert Kibana test architect. Create a simple test plan for ${testType.toUpperCase()} testing.

Plugin Analysis:
- Summary: ${analysis.summary}
- Category: ${analysis.category}
- Use Cases: ${analysis.estimatedUseCases.join(', ')}
- Technical Components: ${analysis.technicalComponents.join(', ')}

User-Provided Details:
- Purpose: ${pluginDetails.purpose}
- Features: ${pluginDetails.features.join(', ')}
- Complexity: ${pluginDetails.complexity}
${testType === 'ui' ? `- User Interactions: ${pluginDetails.userInteractions.join(', ')}` : ''}
${testType === 'api' ? `- API Endpoints: ${pluginDetails.apiEndpoints.join(', ')}` : ''}

Instructions:
1. Create only 2-3 simple test scenarios
2. Focus ONLY on positive test cases (happy path scenarios)
3. Each test should follow: Navigation → Action → Validation pattern
4. Use short, descriptive scenario names suitable for filenames (use underscores, no spaces)
5. Keep tests simple and focused on core functionality

Create 2-3 specific test scenarios. For each scenario, provide:
- Short name suitable for filename (e.g., "basic_search", "create_dashboard")
- Simple description of what the test validates
- Basic steps following navigation/action/validation pattern
- Expected positive outcome

Provide your response in this JSON format:
{
  "testType": "${testType}",
  "scenarios": [
    {
      "name": "short_filename_friendly_name",
      "description": "what this test validates",
      "steps": ["navigate to X", "perform action Y", "validate result Z"],
      "expectedOutcome": "positive outcome",
      "testCategory": "category name"
    }
  ],
  "rationale": "Brief explanation of why these scenarios were chosen",
  "priority": "high"
}

Respond with only the JSON object, no additional text.`;

    try {
      const response = await callLLM(this.model, prompt);
      return JSON.parse(response.trim());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating test plan:', error);
      // Return fallback test plan
      return {
        testType,
        scenarios: [
          {
            name: `Basic ${testType} functionality test`,
            description: `Test core ${testType} functionality of the plugin`,
            steps: ['Navigate to plugin', 'Perform basic action', 'Verify result'],
            expectedOutcome: 'Plugin works as expected',
            testCategory: 'smoke',
          },
        ],
        rationale: 'Basic functionality test to ensure plugin works',
        priority: 'high' as const,
      };
    }
  }

  async generateTestCode(
    scenario: TestScenario,
    pluginDetails: PluginDetails,
    analysis: PluginAnalysis,
    pluginMeta: any,
    testType: 'ui' | 'api'
  ): Promise<string> {
    // Choose the right example based on test type and parallel preference
    let exampleCode: string;
    if (testType === 'ui' && pluginDetails.supportsSpaces && pluginDetails.useParallelTesting) {
      // Use parallel test example for UI tests with spaces
      const parallelExample = getExamplesByCategory('Parallel', testType);
      exampleCode =
        parallelExample.length > 0 ? parallelExample[0].code : getAllExamples(testType)[1].code;
    } else {
      // Use regular examples
      const relevantExamples = getExamplesByCategory(analysis.category, testType);
      exampleCode =
        relevantExamples.length > 0 ? relevantExamples[0].code : getAllExamples(testType)[0].code;
    }

    const prompt = `
You are an expert Kibana test developer. Generate a simple, executable test using the @kbn/scout testing framework.

Plugin Context:
- Name: ${pluginMeta?.plugin?.id || 'test-plugin'}
- Category: ${analysis.category}
- Summary: ${analysis.summary}

Scenario to Implement:
- Name: ${scenario.name}
- Description: ${scenario.description}
- Steps: ${scenario.steps.join(' → ')}
- Expected: ${scenario.expectedOutcome}

Requirements:
1. Generate a single ${testType.toUpperCase()} test file for this scenario only
2. Keep it simple: one describe block with one test case
3. Follow the Navigation → Action → Validation pattern
4. Focus ONLY on positive test cases (happy path)
5. Use realistic but simple selectors and API endpoints
6. Include proper imports and authentication setup
${
  testType === 'ui' && pluginDetails.supportsSpaces && pluginDetails.useParallelTesting
    ? `7. Use 'spaceTest' instead of 'test' for parallel testing with spaces support
8. Import spaceTest from '@kbn/scout' and use scoutSpace in beforeAll/afterAll hooks`
    : `7. Use 'test' for regular testing`
}

Style Guidelines:
- Use clear, descriptive test names
- Include proper imports for @kbn/scout
${
  testType === 'ui' && pluginDetails.supportsSpaces && pluginDetails.useParallelTesting
    ? `- Import spaceTest from '@kbn/scout' for parallel testing
- Use scoutSpace.savedObjects.cleanStandardList() in beforeAll/afterAll`
    : `- Import test from '@kbn/scout' for regular testing`
}
- Use async/await properly
- Add meaningful assertions with expect()
- Handle authentication appropriately
- Use tags.DEPLOYMENT_AGNOSTIC for compatibility
- Keep the test focused and concise

Example Reference (adapt the pattern, don't copy exactly):
${exampleCode}

Generate complete TypeScript test code for this single scenario. The code should be production-ready but simple and focused.

Provide only the TypeScript code, no additional explanation or markdown formatting.`;

    try {
      const response = await callLLM(this.model, prompt);
      return this.removeCodeFence(response.trim());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating test code:', error);
      throw error;
    }
  }

  private removeCodeFence(text: string): string {
    return text
      .replace(/^```[a-zA-Z]*\n?/, '') // remove opening fence with optional language
      .replace(/\s*```$/, ''); // remove closing fence
  }

  async generateFullTest(
    pluginDetails: PluginDetails,
    pluginMeta: any,
    testType: 'ui' | 'api'
  ): Promise<Array<{ name: string; code: string }>> {
    // eslint-disable-next-line no-console
    console.log(`🔍 Step 1: Analyzing plugin characteristics...`);
    const analysis = await this.analyzePlugin(pluginDetails, pluginMeta);

    // eslint-disable-next-line no-console
    console.log(`📋 Step 2: Creating ${testType.toUpperCase()} test plan...`);
    const testPlan = await this.generateTestPlan(pluginDetails, analysis, testType);

    // eslint-disable-next-line no-console
    console.log(`⚡ Step 3: Generating test code for ${testPlan.scenarios.length} scenarios...`);

    const testFiles: Array<{ name: string; code: string }> = [];

    for (const scenario of testPlan.scenarios) {
      // eslint-disable-next-line no-console
      console.log(`   📝 Generating test for: ${scenario.name}`);
      const testCode = await this.generateTestCode(
        scenario,
        pluginDetails,
        analysis,
        pluginMeta,
        testType
      );
      testFiles.push({
        name: scenario.name,
        code: testCode,
      });
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Generated ${testFiles.length} test files for ${testType} testing`);

    return testFiles;
  }
}
