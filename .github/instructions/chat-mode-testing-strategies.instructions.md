---
description: 'Testing strategies and patterns for different AI chat modes, tools, and execution contexts in GitHub Copilot'
applyTo: '**'
---
# Chat Mode Testing Strategies

## Overview

This instruction provides comprehensive testing strategies for different AI chat modes, tools, and execution contexts. It covers agent mode, ask mode, and specialized testing patterns for various development scenarios.

## Chat Mode Testing Framework

### Agent Mode Testing (`mode: 'agent'`)

**Purpose**: Testing complex workflows requiring multiple tools and systematic problem-solving

**Available Tools**:
- `changes`: Repository change analysis and tracking
- `codebase`: Codebase search and understanding
- `editFiles`: File modification and creation
- `problems`: Issue detection and resolution
- `search`: Information discovery and research

**Testing Focus Areas**:
```markdown
Complex Workflow Testing:
- Multi-step development processes
- Cross-file dependency analysis
- End-to-end feature implementation
- Refactoring and architectural changes
- Debugging and problem resolution

Tool Integration Testing:
- Sequential tool usage patterns
- Tool output validation and chaining
- Error handling between tools
- Performance optimization across tools
- Context preservation between operations
```

**Agent Mode Test Cases**:
```typescript
interface AgentTestCase {
    name: string;
    objective: string;
    requiredTools: string[];
    expectedWorkflow: string[];
    successCriteria: {
        toolUsage: string[];
        outputQuality: number;
        problemResolution: boolean;
        contextMaintenance: boolean;
    };
    validationSteps: string[];
}

const agentTestCases: AgentTestCase[] = [
    {
        name: "End-to-End Feature Implementation",
        objective: "Implement a complete feature from requirements to tests",
        requiredTools: ["codebase", "editFiles", "problems", "search"],
        expectedWorkflow: [
            "Analyze requirements using search",
            "Understand existing codebase structure",
            "Identify implementation approach",
            "Create/modify necessary files",
            "Detect and resolve integration issues",
            "Validate implementation completeness"
        ],
        successCriteria: {
            toolUsage: ["All required tools used appropriately"],
            outputQuality: 90,
            problemResolution: true,
            contextMaintenance: true
        },
        validationSteps: [
            "Verify all files created/modified correctly",
            "Check integration with existing code",
            "Validate test coverage and functionality",
            "Confirm requirements fulfillment"
        ]
    }
];
```

**Agent Mode Performance Metrics**:
```markdown
Efficiency Metrics:
- Task Completion Time: Average time for complex workflows
- Tool Utilization: Percentage of appropriate tool usage
- Context Preservation: Maintenance of context across operations
- Error Recovery: Ability to handle and resolve issues

Quality Metrics:
- Solution Completeness: Coverage of all requirements
- Code Quality: Adherence to standards and best practices
- Integration Success: Proper integration with existing codebase
- Documentation Quality: Clarity and completeness of explanations
```

### Ask Mode Testing (`mode: 'ask'`)

**Purpose**: Testing quick guidance, validation, and consultation scenarios

**Testing Focus Areas**:
```markdown
Knowledge Validation:
- Technical accuracy of responses
- Currency of information provided
- Completeness of explanations
- Clarity for target audience

Guidance Quality:
- Actionable recommendations
- Risk assessment and mitigation
- Alternative solution presentation
- Best practice adherence

Response Efficiency:
- Speed of response generation
- Conciseness without losing clarity
- Relevance to specific questions
- Follow-up question anticipation
```

**Ask Mode Test Patterns**:
```typescript
interface AskTestPattern {
    category: string;
    scenarios: {
        question: string;
        context?: string;
        expectedResponseType: string;
        qualityMetrics: {
            accuracy: number;
            completeness: number;
            clarity: number;
            actionability: number;
        };
    }[];
}

const askTestPatterns: AskTestPattern[] = [
    {
        category: "Technical Guidance",
        scenarios: [
            {
                question: "What's the best approach for implementing user authentication?",
                context: "Node.js application with Express and MongoDB",
                expectedResponseType: "Comprehensive guidance with multiple options",
                qualityMetrics: {
                    accuracy: 95,
                    completeness: 85,
                    clarity: 90,
                    actionability: 90
                }
            },
            {
                question: "How do I optimize this database query?",
                context: "Slow performing SQL query with joins",
                expectedResponseType: "Specific optimization strategies",
                qualityMetrics: {
                    accuracy: 98,
                    completeness: 80,
                    clarity: 85,
                    actionability: 95
                }
            }
        ]
    }
];
```

## Tool-Specific Testing Strategies

### Codebase Tool Testing

**Testing Objectives**:
- Code search accuracy and relevance
- Pattern recognition and analysis
- Dependency mapping and understanding
- Architecture comprehension

**Test Scenarios**:
```markdown
Search Accuracy Tests:
- Function/method location by name
- Pattern-based code discovery
- Dependency relationship identification
- Architecture component mapping

Understanding Tests:
- Code purpose and functionality explanation
- Design pattern recognition
- Performance bottleneck identification
- Security vulnerability detection

Analysis Tests:
- Code quality assessment
- Refactoring opportunity identification
- Technical debt evaluation
- Compliance checking
```

### EditFiles Tool Testing

**Testing Objectives**:
- File creation and modification accuracy
- Code generation quality
- Integration with existing code
- Preservation of existing functionality

**Test Scenarios**:
```markdown
Creation Tests:
- New file generation with proper structure
- Template and boilerplate creation
- Configuration file setup
- Documentation generation

Modification Tests:
- Targeted code changes without side effects
- Refactoring without breaking functionality
- Feature addition with proper integration
- Bug fixes with comprehensive testing

Quality Assurance:
- Syntax correctness verification
- Style guide adherence
- Security best practice implementation
- Performance optimization validation
```

### Problems Tool Testing

**Testing Objectives**:
- Issue detection accuracy
- Root cause analysis quality
- Solution recommendation effectiveness
- Prevention strategy development

**Test Scenarios**:
```markdown
Detection Tests:
- Syntax error identification
- Logic error discovery
- Performance issue recognition
- Security vulnerability detection

Analysis Tests:
- Root cause determination
- Impact assessment
- Priority classification
- Dependency analysis

Resolution Tests:
- Solution effectiveness
- Side effect prevention
- Implementation guidance
- Verification procedures
```

## Specialized Testing Patterns

### Multi-Tool Integration Testing

**Integration Test Framework**:
```typescript
class MultiToolTestSuite {
    async testToolChaining(testCase: IntegrationTestCase) {
        const results = [];
        
        for (const step of testCase.workflow) {
            const result = await this.executeToolStep(step);
            results.push(result);
            
            // Validate step output before proceeding
            if (!this.validateStepOutput(result, step.expectedOutput)) {
                throw new Error(`Step ${step.tool} failed validation`);
            }
        }
        
        return this.evaluateOverallResult(results, testCase.successCriteria);
    }
    
    validateContextPreservation(results: ToolResult[]) {
        // Ensure context is maintained across tool usage
        for (let i = 1; i < results.length; i++) {
            if (!this.contextMatches(results[i-1], results[i])) {
                return false;
            }
        }
        return true;
    }
}
```

### Error Handling and Recovery Testing

**Error Scenario Testing**:
```markdown
Error Categories:
1. Tool Execution Errors:
   - Network connectivity issues
   - Permission and access errors
   - Resource unavailability
   - Tool-specific failures

2. Context Loss Scenarios:
   - Session interruption handling
   - State recovery mechanisms
   - Partial completion recovery
   - Context reconstruction

3. Input Validation Errors:
   - Malformed input handling
   - Boundary condition testing
   - Type validation failures
   - Security input filtering

4. Output Quality Issues:
   - Incomplete response handling
   - Quality threshold failures
   - Inconsistent output formats
   - Validation error responses
```

**Recovery Validation**:
```typescript
interface RecoveryTestCase {
    errorType: string;
    triggerCondition: string;
    expectedRecovery: string;
    recoveryTime: number;
    dataIntegrity: boolean;
    userExperience: {
        errorMessage: string;
        guidanceProvided: boolean;
        alternativeOffered: boolean;
    };
}
```

## Performance Testing for Chat Modes

### Response Time Testing

**Performance Benchmarks**:
```markdown
Agent Mode Benchmarks:
- Simple Tool Usage: <2 seconds
- Complex Workflow: <30 seconds
- Multi-File Operations: <45 seconds
- Full Feature Implementation: <5 minutes

Ask Mode Benchmarks:
- Simple Questions: <1 second
- Complex Explanations: <3 seconds
- Research-Heavy Responses: <10 seconds
- Comprehensive Guidance: <15 seconds
```

**Load Testing Scenarios**:
```typescript
class ChatModeLoadTest {
    async testConcurrentSessions(mode: 'agent' | 'ask') {
        const scenarios = [
            { concurrent: 5, duration: '2m' },
            { concurrent: 15, duration: '5m' },
            { concurrent: 30, duration: '10m' }
        ];
        
        for (const scenario of scenarios) {
            const results = await this.runConcurrentTest(mode, scenario);
            await this.analyzeConcurrencyImpact(results);
        }
    }
}
```

## Quality Metrics for Chat Modes

### Effectiveness Measurement

**Agent Mode Quality Metrics**:
```markdown
Task Completion Metrics:
- Success Rate: Percentage of fully completed tasks
- Partial Completion: Tasks completed with minor gaps
- Tool Utilization Efficiency: Optimal tool usage patterns
- Workflow Optimization: Streamlined process execution

Quality Indicators:
- Code Quality Score: Generated code quality assessment
- Integration Success: Seamless integration with existing code
- Problem Resolution: Effective issue identification and fixing
- Documentation Completeness: Thoroughness of explanations
```

**Ask Mode Quality Metrics**:
```markdown
Response Quality Metrics:
- Accuracy Score: Factual correctness of responses
- Completeness Rating: Coverage of question aspects
- Clarity Index: Ease of understanding responses
- Actionability Score: Usefulness for next steps

User Satisfaction Metrics:
- Relevance Rating: Response relevance to question
- Helpfulness Score: Practical value of guidance
- Confidence Level: User confidence in recommendations
- Follow-up Questions: Need for additional clarification
```

### Continuous Improvement Framework

**Quality Monitoring Pipeline**:
```yaml
monitoring_pipeline:
  agent_mode:
    metrics:
      - task_completion_rate
      - tool_utilization_efficiency
      - workflow_optimization_score
      - integration_success_rate
    thresholds:
      task_completion: 85%
      tool_efficiency: 80%
      workflow_optimization: 75%
      integration_success: 90%
  
  ask_mode:
    metrics:
      - response_accuracy
      - response_completeness
      - user_satisfaction
      - guidance_actionability
    thresholds:
      accuracy: 95%
      completeness: 85%
      satisfaction: 8.0/10
      actionability: 80%
```

**Feedback Integration**:
```typescript
class ChatModeFeedbackProcessor {
    async processFeedback(feedback: UserFeedback) {
        const analysis = await this.analyzeFeedback(feedback);
        
        if (analysis.mode === 'agent') {
            await this.updateAgentModePatterns(analysis.insights);
        } else if (analysis.mode === 'ask') {
            await this.updateAskModeKnowledge(analysis.insights);
        }
        
        await this.trackImprovementMetrics(analysis);
    }
}
```

## Testing Best Practices

### Test Case Design

**Comprehensive Test Coverage**:
```markdown
Test Dimensions:
1. Functional Coverage:
   - Core functionality validation
   - Edge case handling
   - Error condition testing
   - Integration verification

2. Performance Coverage:
   - Response time validation
   - Throughput testing
   - Resource utilization
   - Scalability assessment

3. Quality Coverage:
   - Output quality assessment
   - User experience validation
   - Consistency verification
   - Improvement tracking

4. Safety Coverage:
   - Content safety validation
   - Bias detection testing
   - Privacy protection verification
   - Security vulnerability assessment
```

### Test Automation Strategy

**Automated Test Framework**:
```typescript
class ChatModeTestFramework {
    async runTestSuite(mode: ChatMode, testSuite: TestSuite) {
        const results = {
            functional: await this.runFunctionalTests(mode, testSuite.functional),
            performance: await this.runPerformanceTests(mode, testSuite.performance),
            quality: await this.runQualityTests(mode, testSuite.quality),
            safety: await this.runSafetyTests(mode, testSuite.safety)
        };
        
        return this.generateTestReport(results);
    }
    
    async validateChatModeSwitch(fromMode: ChatMode, toMode: ChatMode) {
        // Test context preservation during mode switching
        const context = await this.captureContext(fromMode);
        await this.switchMode(toMode);
        const preservedContext = await this.validateContext(context);
        
        return preservedContext;
    }
}
```

This comprehensive testing strategy ensures that different chat modes are thoroughly validated for functionality, performance, quality, and safety across all usage scenarios.
