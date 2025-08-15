---
description: 'Automated testing frameworks and evaluation methodologies for AI prompts, including test case generation, execution, and continuous improvement'
applyTo: '**'
---
# Automated Prompt Evaluation

## Overview

This instruction provides comprehensive frameworks for automated testing and evaluation of AI prompts. It covers test case generation, automated execution, metrics collection, and continuous improvement processes for prompt engineering.

## Automated Testing Framework

### Core Testing Architecture

**Testing Pipeline Structure**:
```typescript
interface PromptTestingPipeline {
    // Test case generation and management
    testGeneration: {
        dynamicCaseGeneration: boolean;
        scenarioTemplates: TestScenarioTemplate[];
        edgeCaseDetection: boolean;
        regressionTestCreation: boolean;
    };
    
    // Execution framework
    execution: {
        parallelExecution: boolean;
        batchProcessing: boolean;
        environmentIsolation: boolean;
        resourceManagement: boolean;
    };
    
    // Evaluation and metrics
    evaluation: {
        automaticScoring: boolean;
        qualityMetrics: QualityMetric[];
        safetyValidation: boolean;
        performanceTracking: boolean;
    };
    
    // Reporting and improvement
    reporting: {
        realTimeMetrics: boolean;
        trendAnalysis: boolean;
        alerting: boolean;
        improvementRecommendations: boolean;
    };
}
```

**Test Case Generation Framework**:
```typescript
class AutomatedTestGenerator {
    async generateTestCases(promptConfig: PromptConfiguration): Promise<TestCase[]> {
        const testCases = [];
        
        // Generate functional test cases
        testCases.push(...await this.generateFunctionalTests(promptConfig));
        
        // Generate edge case tests
        testCases.push(...await this.generateEdgeCaseTests(promptConfig));
        
        // Generate safety and bias tests
        testCases.push(...await this.generateSafetyTests(promptConfig));
        
        // Generate performance tests
        testCases.push(...await this.generatePerformanceTests(promptConfig));
        
        return testCases;
    }
    
    private async generateFunctionalTests(config: PromptConfiguration): Promise<TestCase[]> {
        return [
            {
                id: 'func_001',
                name: 'Basic Functionality',
                input: this.generateTypicalInput(config),
                expectedOutput: this.defineExpectedOutput(config),
                validationCriteria: this.getFunctionalCriteria(config),
                category: 'functional'
            }
        ];
    }
}
```

### Test Case Templates

**Scenario-Based Test Templates**:
```markdown
Test Template Categories:

1. Functional Test Templates:
   - Happy Path Scenarios
   - Input Validation Tests
   - Output Format Verification
   - Requirement Compliance Tests

2. Edge Case Templates:
   - Boundary Condition Tests
   - Empty/Null Input Handling
   - Maximum Length Input Tests
   - Unusual Character Handling

3. Safety Test Templates:
   - Content Safety Validation
   - Bias Detection Tests
   - Privacy Protection Tests
   - Security Vulnerability Tests

4. Performance Test Templates:
   - Response Time Validation
   - Load Testing Scenarios
   - Resource Utilization Tests
   - Scalability Assessments
```

**Dynamic Test Case Generation**:
```typescript
interface TestCaseTemplate {
    name: string;
    category: 'functional' | 'safety' | 'performance' | 'edge_case';
    inputPattern: string;
    expectedOutputPattern: string;
    validationRules: ValidationRule[];
    variationParameters: VariationParameter[];
}

class DynamicTestGenerator {
    async generateVariations(template: TestCaseTemplate): Promise<TestCase[]> {
        const variations = [];
        
        for (const params of this.generateParameterCombinations(template.variationParameters)) {
            const testCase = await this.instantiateTemplate(template, params);
            variations.push(testCase);
        }
        
        return variations;
    }
    
    private generateParameterCombinations(parameters: VariationParameter[]): ParameterSet[] {
        // Generate all meaningful combinations of parameter values
        return this.cartesianProduct(parameters.map(p => p.values));
    }
}
```

## Evaluation Metrics & Scoring

### Comprehensive Scoring Framework

**Multi-Dimensional Scoring System**:
```typescript
interface PromptEvaluationScore {
    overall: number;                    // 0-100 composite score
    
    functional: {
        accuracy: number;               // Correctness of output
        completeness: number;           // Coverage of requirements
        relevance: number;              // Relevance to input
        consistency: number;            // Consistency across runs
    };
    
    quality: {
        clarity: number;                // Output clarity and readability
        structure: number;              // Organization and formatting
        language: number;               // Grammar and style
        professionalism: number;        // Professional tone and content
    };
    
    safety: {
        contentSafety: number;          // 0-100 safety score
        biasDetection: number;          // Bias-free score
        privacyCompliance: number;      // Privacy protection score
        securityRisk: number;           // Security vulnerability score
    };
    
    performance: {
        responseTime: number;           // Speed of response
        resourceEfficiency: number;     // Resource utilization
        scalability: number;            // Performance under load
        reliability: number;            // Consistency of performance
    };
    
    usability: {
        userSatisfaction: number;       // User experience score
        taskCompletion: number;         // Task success rate
        errorRecovery: number;          // Error handling quality
        accessibility: number;          // Accessibility compliance
    };
}
```

**Automated Scoring Algorithms**:
```typescript
class AutomatedScorer {
    async scorePromptResponse(
        input: string,
        output: string,
        expectedOutput: string,
        criteria: EvaluationCriteria
    ): Promise<PromptEvaluationScore> {
        
        const functional = await this.scoreFunctional(output, expectedOutput, criteria);
        const quality = await this.scoreQuality(output, criteria);
        const safety = await this.scoreSafety(output, criteria);
        const performance = await this.scorePerformance(input, output, criteria);
        const usability = await this.scoreUsability(output, criteria);
        
        const overall = this.calculateOverallScore(functional, quality, safety, performance, usability);
        
        return { overall, functional, quality, safety, performance, usability };
    }
    
    private async scoreFunctional(
        output: string,
        expected: string,
        criteria: EvaluationCriteria
    ): Promise<FunctionalScore> {
        return {
            accuracy: await this.calculateAccuracy(output, expected),
            completeness: await this.calculateCompleteness(output, criteria.requirements),
            relevance: await this.calculateRelevance(output, criteria.context),
            consistency: await this.calculateConsistency(output, criteria.patterns)
        };
    }
}
```

### Metric Collection & Analysis

**Real-Time Metrics Dashboard**:
```typescript
interface MetricsDashboard {
    realTimeMetrics: {
        currentScore: number;
        testsRunning: number;
        testsCompleted: number;
        failureRate: number;
        averageResponseTime: number;
    };
    
    historicalTrends: {
        scoreHistory: TimeSeriesData[];
        performanceHistory: TimeSeriesData[];
        safetyHistory: TimeSeriesData[];
        usageHistory: TimeSeriesData[];
    };
    
    alerts: {
        qualityDegradation: Alert[];
        safetyViolations: Alert[];
        performanceIssues: Alert[];
        systemErrors: Alert[];
    };
    
    insights: {
        topFailures: FailurePattern[];
        improvementOpportunities: Recommendation[];
        bestPerformingPrompts: PromptAnalysis[];
        trendAnalysis: TrendInsight[];
    };
}
```

**Automated Metric Collection**:
```typescript
class MetricsCollector {
    private collectors: Map<string, MetricCollector> = new Map();
    
    async collectMetrics(testRun: TestRun): Promise<MetricsSnapshot> {
        const metrics: MetricsSnapshot = {
            timestamp: new Date(),
            testRunId: testRun.id,
            metrics: {}
        };
        
        for (const [name, collector] of this.collectors) {
            try {
                metrics.metrics[name] = await collector.collect(testRun);
            } catch (error) {
                console.error(`Failed to collect metric ${name}:`, error);
                metrics.metrics[name] = { error: error.message };
            }
        }
        
        await this.storeMetrics(metrics);
        await this.triggerAlerts(metrics);
        
        return metrics;
    }
    
    registerCollector(name: string, collector: MetricCollector): void {
        this.collectors.set(name, collector);
    }
}
```

## Continuous Testing Integration

### CI/CD Pipeline Integration

**Automated Testing Workflow**:
```yaml
name: Prompt Testing Pipeline

on:
  push:
    paths:
      - 'prompts/**'
      - 'tests/prompts/**'
  pull_request:
    paths:
      - 'prompts/**'
      - 'tests/prompts/**'
  schedule:
    - cron: '0 0 * * *'  # Daily testing

jobs:
  prompt-testing:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        test-category: [functional, safety, performance, edge-case]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup test environment
        run: |
          npm install
          npm run setup-test-env
      
      - name: Generate test cases
        run: |
          npm run generate-tests -- --category ${{ matrix.test-category }}
      
      - name: Run automated tests
        run: |
          npm run test-prompts -- --category ${{ matrix.test-category }} --parallel
      
      - name: Collect metrics
        run: |
          npm run collect-metrics -- --test-run ${{ github.run_id }}
      
      - name: Generate report
        run: |
          npm run generate-report -- --format json --output test-results-${{ matrix.test-category }}.json
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.test-category }}
          path: test-results-${{ matrix.test-category }}.json
      
      - name: Check quality gates
        run: |
          npm run check-quality-gates -- --results test-results-${{ matrix.test-category }}.json
```

**Quality Gates Configuration**:
```typescript
interface QualityGates {
    gates: {
        overallScore: {
            minimum: number;            // Minimum overall score (e.g., 85)
            trend: 'improving' | 'stable' | 'any';
        };
        
        functionalAccuracy: {
            minimum: number;            // Minimum accuracy (e.g., 95%)
            regression: number;         // Max acceptable regression (e.g., 5%)
        };
        
        safetyCompliance: {
            minimum: number;            // Minimum safety score (e.g., 100%)
            violations: number;         // Max acceptable violations (e.g., 0)
        };
        
        performanceThresholds: {
            responseTime: number;       // Max response time (e.g., 2000ms)
            throughput: number;         // Min throughput (e.g., 100 rps)
        };
        
        regressionPrevention: {
            enabled: boolean;
            threshold: number;          // Max regression percentage
            comparisonWindow: string;   // e.g., '7d', '30d'
        };
    };
    
    actions: {
        onFailure: 'block' | 'warn' | 'notify';
        escalation: EscalationPolicy;
        rollback: RollbackPolicy;
    };
}
```

### Regression Testing Framework

**Automated Regression Detection**:
```typescript
class RegressionDetector {
    async detectRegression(
        currentResults: TestResults,
        historicalResults: TestResults[]
    ): Promise<RegressionAnalysis> {
        
        const baseline = this.calculateBaseline(historicalResults);
        const regressions = [];
        
        // Check overall score regression
        if (currentResults.overallScore < baseline.overallScore - this.regressionThreshold) {
            regressions.push({
                type: 'overall_score',
                current: currentResults.overallScore,
                baseline: baseline.overallScore,
                severity: this.calculateSeverity(currentResults.overallScore, baseline.overallScore)
            });
        }
        
        // Check category-specific regressions
        for (const category of Object.keys(baseline.categories)) {
            const currentScore = currentResults.categories[category];
            const baselineScore = baseline.categories[category];
            
            if (currentScore < baselineScore - this.categoryRegressionThreshold) {
                regressions.push({
                    type: 'category_regression',
                    category,
                    current: currentScore,
                    baseline: baselineScore,
                    severity: this.calculateSeverity(currentScore, baselineScore)
                });
            }
        }
        
        return {
            hasRegression: regressions.length > 0,
            regressions,
            recommendations: await this.generateRecommendations(regressions)
        };
    }
}
```

## Performance Optimization

### Load Testing Framework

**Automated Load Testing**:
```typescript
interface LoadTestConfiguration {
    scenarios: LoadTestScenario[];
    duration: string;                   // e.g., '10m', '1h'
    rampUp: string;                     // e.g., '30s', '2m'
    targetUsers: number[];              // e.g., [10, 50, 100, 500]
    thresholds: PerformanceThresholds;
}

class LoadTestRunner {
    async runLoadTest(config: LoadTestConfiguration): Promise<LoadTestResults> {
        const results: LoadTestResults = {
            scenarios: [],
            summary: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                p95ResponseTime: 0,
                p99ResponseTime: 0,
                throughput: 0
            }
        };
        
        for (const userCount of config.targetUsers) {
            const scenarioResults = await this.runScenario(config, userCount);
            results.scenarios.push(scenarioResults);
            
            // Check if thresholds are exceeded
            if (this.exceedsThresholds(scenarioResults, config.thresholds)) {
                console.warn(`Performance thresholds exceeded at ${userCount} users`);
                break;
            }
        }
        
        results.summary = this.calculateSummary(results.scenarios);
        return results;
    }
}
```

### Resource Monitoring

**Resource Utilization Tracking**:
```typescript
class ResourceMonitor {
    private metrics: ResourceMetrics[] = [];
    
    async startMonitoring(): Promise<void> {
        this.monitoringInterval = setInterval(async () => {
            const metrics = await this.collectResourceMetrics();
            this.metrics.push(metrics);
            
            // Check for resource alerts
            await this.checkResourceAlerts(metrics);
        }, 5000); // Collect every 5 seconds
    }
    
    private async collectResourceMetrics(): Promise<ResourceMetrics> {
        return {
            timestamp: new Date(),
            cpu: {
                usage: await this.getCpuUsage(),
                cores: os.cpus().length
            },
            memory: {
                used: process.memoryUsage().heapUsed,
                total: process.memoryUsage().heapTotal,
                external: process.memoryUsage().external
            },
            network: {
                bytesIn: await this.getNetworkBytesIn(),
                bytesOut: await this.getNetworkBytesOut()
            },
            disk: {
                reads: await this.getDiskReads(),
                writes: await this.getDiskWrites()
            }
        };
    }
}
```

## Reporting & Analytics

### Comprehensive Test Reporting

**Automated Report Generation**:
```typescript
class TestReportGenerator {
    async generateComprehensiveReport(testRun: TestRun): Promise<TestReport> {
        const report: TestReport = {
            metadata: {
                testRunId: testRun.id,
                timestamp: new Date(),
                duration: testRun.endTime - testRun.startTime,
                environment: testRun.environment
            },
            
            summary: await this.generateSummary(testRun),
            functional: await this.generateFunctionalReport(testRun),
            safety: await this.generateSafetyReport(testRun),
            performance: await this.generatePerformanceReport(testRun),
            
            trends: await this.generateTrendAnalysis(testRun),
            recommendations: await this.generateRecommendations(testRun),
            
            artifacts: {
                testCases: testRun.testCases,
                metrics: testRun.metrics,
                logs: testRun.logs
            }
        };
        
        return report;
    }
    
    async generateExecutiveSummary(report: TestReport): Promise<ExecutiveSummary> {
        return {
            overallHealth: this.calculateOverallHealth(report),
            keyMetrics: this.extractKeyMetrics(report),
            criticalIssues: this.identifyCriticalIssues(report),
            recommendations: this.prioritizeRecommendations(report.recommendations),
            nextSteps: this.defineNextSteps(report)
        };
    }
}
```

### Analytics & Insights

**Automated Insight Generation**:
```typescript
class PromptAnalyticsEngine {
    async generateInsights(historicalData: TestResults[]): Promise<AnalyticsInsights> {
        return {
            patterns: await this.identifyPatterns(historicalData),
            anomalies: await this.detectAnomalies(historicalData),
            trends: await this.analyzeTrends(historicalData),
            predictions: await this.generatePredictions(historicalData),
            optimizations: await this.suggestOptimizations(historicalData)
        };
    }
    
    private async identifyPatterns(data: TestResults[]): Promise<Pattern[]> {
        // Machine learning-based pattern detection
        return this.patternDetectionModel.analyze(data);
    }
    
    private async suggestOptimizations(data: TestResults[]): Promise<Optimization[]> {
        const lowPerformingAreas = this.identifyLowPerformingAreas(data);
        return lowPerformingAreas.map(area => ({
            area: area.category,
            currentScore: area.score,
            targetScore: area.score * 1.2, // 20% improvement target
            strategies: this.getOptimizationStrategies(area.category),
            estimatedImpact: this.estimateImpact(area),
            priority: this.calculatePriority(area)
        }));
    }
}
```

This comprehensive automated evaluation framework ensures thorough, consistent, and continuous testing of AI prompts while providing actionable insights for improvement.
