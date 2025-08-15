---
description: 'Comprehensive framework for testing AI prompts, chat modes, and instructions using best practices from github/awesome-copilot repository'
applyTo: '**'
---
# Prompt Testing Framework

## Overview

This instruction provides a structured framework for testing AI prompts, chat modes, and instructions based on best practices from the github/awesome-copilot repository. Use this framework to validate prompt effectiveness, safety, and quality.

## Core Testing Framework

### 1. Test Planning & Quality Assurance

**Objective**: Create comprehensive test strategies following ISTQB and ISO 25010 standards

**Test Strategy Generation**:
- Create test strategies for complex prompt workflows
- Generate QA plans with quality gates and metrics validation
- Build GitHub issue templates for prompt testing
- Define entry/exit criteria for testing phases

**Quality Gates Implementation**:
```markdown
Entry Criteria:
- [ ] Requirements clearly defined
- [ ] Test cases documented
- [ ] Safety checklist completed

Exit Criteria:
- [ ] All test cases passed
- [ ] Safety validation complete
- [ ] Performance metrics met

Quality Metrics:
- Test Coverage: >80% scenario coverage
- Safety Score: 100% safety checks passed
- Response Quality: >90% acceptable outputs
```

### 2. Unit Testing Framework

**JavaScript/TypeScript Testing**:
- Jest: Comprehensive testing with mocking and coverage
- Focus on async prompt testing patterns

### 3. Prompt Validation Testing

**Test Case Structure**:
```typescript
const promptTestCases = [
    {
        name: "Basic Function Generation",
        input: "Write a function to add two numbers",
        expectedOutput: "Should include function definition and basic arithmetic",
        safetyCheck: "Should not contain harmful content",
        biasCheck: "Should use inclusive language",
        qualityMetrics: {
            completeness: "Must include all required components",
            accuracy: "Must be syntactically correct",
            clarity: "Must be well-documented"
        }
    },
    {
        name: "Edge Case Handling",
        input: "Generate code for handling null values",
        expectedOutput: "Should include proper error handling",
        safetyCheck: "Should not expose security vulnerabilities",
        edgeCases: ["null input", "undefined input", "empty objects"]
    }
];
```

**Validation Workflow**:
1. **Input Validation**: Verify prompt inputs are safe and well-formed
2. **Output Assessment**: Check generated content against criteria
3. **Safety Screening**: Run through safety and bias checks
4. **Quality Metrics**: Measure completeness, accuracy, and usability
5. **Edge Case Testing**: Validate behavior with unusual inputs

## Testing Modes & Chat Configurations

### Agent Mode (`mode: 'agent'`)
**Best For**: Complex testing workflows requiring multiple tools
- Test strategy development
- Comprehensive QA planning
- Multi-step validation processes

**Available Tools**: `['changes', 'codebase', 'editFiles', 'problems', 'search']`

**Testing Focus**:
- End-to-end prompt workflows
- Integration between multiple tools
- Complex reasoning and planning tasks

### Ask Mode (`mode: 'ask'`)
**Best For**: Quick testing guidance and validation
- Test case review and feedback
- Framework selection advice
- Testing pattern clarification

**Testing Focus**:
- Quick validation of prompt effectiveness
- Guidance on testing approaches
- Clarification of testing requirements

## Safety & Quality Testing

### AI Safety Testing Protocol

**Safety Validation Checklist**:
- [ ] Content Safety: No harmful, offensive, or inappropriate content
- [ ] Bias Detection: No discriminatory or unfair bias
- [ ] Privacy Protection: No exposure of sensitive information
- [ ] Security: No vulnerabilities or malicious code
- [ ] Misinformation: No false or misleading information

**Red-teaming Approach**:
```markdown
Test Case Categories:
1. Adversarial Inputs: Intentionally problematic prompts
2. Edge Cases: Unusual or boundary conditions
3. Jailbreak Attempts: Attempts to bypass safety measures
4. Bias Triggers: Inputs that might reveal bias
5. Security Probes: Attempts to extract sensitive information
```

**Human-in-the-Loop Review**:
1. Automated Check: Initial safety screening
2. Human Review: Manual review for flagged content
3. Decision: Approve, reject, or modify
4. Documentation: Record decisions and reasoning

### Quality Assurance Framework

**Quality Metrics**:
- **Functional Coverage**: 100% acceptance criteria validation
- **Test Coverage**: >80% line coverage, >90% branch coverage
- **Quality Gate Compliance**: 100% gates passed before release
- **Defect Detection Rate**: >95% found before production

**Process Efficiency Metrics**:
- Test Planning Time: <2 hours for comprehensive strategy
- Quality Feedback Time: <2 hours from completion to assessment
- Documentation Completeness: 100% template compliance

## Testing Best Practices

### Prompt Design Testing

**Design Validation Checklist**:
- [ ] Task Definition: Clear, specific, and unambiguous
- [ ] Context Provision: Sufficient background information
- [ ] Constraint Specification: Well-defined limitations and requirements
- [ ] Example Quality: Representative and helpful examples
- [ ] Safety Considerations: Appropriate safety measures

**Anti-pattern Detection**:
- [ ] Ambiguity: Multiple possible interpretations
- [ ] Verbosity: Unnecessary complexity or wordiness
- [ ] Injection Risks: Vulnerability to prompt injection
- [ ] Overfitting: Too specific to training data

### Automated Testing Implementation

**Test Automation Strategy**:
```javascript
// Example automated test framework
class PromptTestFramework {
    async testPrompt(promptConfig) {
        const results = {
            functional: await this.functionalTest(promptConfig),
            safety: await this.safetyTest(promptConfig),
            performance: await this.performanceTest(promptConfig),
            bias: await this.biasTest(promptConfig)
        };
        
        return this.evaluateResults(results);
    }
    
    async safetyTest(promptConfig) {
        // Implement safety validation
        return {
            harmfulContent: false,
            biasDetected: false,
            privacyViolation: false,
            securityRisk: false
        };
    }
}
```

### Continuous Testing Pipeline

**Testing Workflow Integration**:
1. **Pre-commit Testing**: Basic validation before code submission
2. **CI/CD Integration**: Automated testing in build pipeline
3. **Staging Validation**: Comprehensive testing in staging environment
4. **Production Monitoring**: Ongoing quality and safety monitoring

**Monitoring & Feedback Loop**:
- Real-time quality metrics tracking
- User feedback collection and analysis
- Automated alerting for quality degradation
- Regular review and improvement cycles

## Documentation & Reporting

### Test Documentation Template

```markdown
## Prompt Test Report

### Test Overview
- **Prompt Name**: [Name of the prompt being tested]
- **Test Date**: [Date of testing]
- **Tester**: [Person/team conducting the test]
- **Version**: [Prompt version being tested]

### Test Results
- **Functional Tests**: [Pass/Fail with details]
- **Safety Tests**: [Pass/Fail with safety score]
- **Performance Tests**: [Metrics and benchmark results]
- **User Acceptance**: [Feedback and satisfaction scores]

### Issues Identified
- **Critical**: [Issues that prevent deployment]
- **Major**: [Issues that significantly impact quality]
- **Minor**: [Issues that should be addressed but don't block]

### Recommendations
- **Immediate Actions**: [Required fixes before deployment]
- **Future Improvements**: [Enhancements for next iteration]
- **Process Improvements**: [Testing process refinements]
```

### Metrics Dashboard

**Key Performance Indicators**:
- Test Coverage Percentage
- Safety Validation Score
- User Satisfaction Rating
- Response Time Metrics
- Error Rate Tracking

## Implementation Guidelines

### Getting Started
1. **Choose Test Framework**: Select appropriate testing tools for your stack
2. **Define Test Cases**: Create comprehensive test scenarios
3. **Set Quality Gates**: Establish acceptance criteria
4. **Implement Automation**: Build automated testing pipeline
5. **Monitor Results**: Track metrics and improve continuously

### Best Practices
- Start with safety and bias testing as highest priority
- Use diverse test cases representing real-world usage
- Implement both automated and human review processes
- Document all testing decisions and rationale
- Continuously refine testing approach based on results

### Tools and Resources
- **Testing Frameworks**: Jest, XUnit, JUnit, NUnit based on technology
- **Safety Tools**: Content moderation APIs, bias detection tools
- **Monitoring**: Analytics dashboards, user feedback systems
- **Documentation**: Test reporting templates, quality metrics tracking

This framework provides a comprehensive approach to prompt testing that ensures safety, quality, and effectiveness while following industry best practices.
