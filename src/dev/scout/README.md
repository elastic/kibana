# Kibana Plugin Test Generator

An intelligent test generation tool that creates comprehensive Scout tests for Kibana plugins using LLM-powered analysis and multi-step prompting.

## Features

### 🎯 Interactive CLI Interface
- Guided prompts for plugin details and requirements
- Support for different test types (UI, API, or both)
- Customizable complexity levels and feature descriptions
- Multi-line input support for detailed specifications

### 🧠 Multi-Step LLM Prompting
The generator uses a sophisticated 3-step approach:

1. **Plugin Analysis**: Analyzes plugin purpose, categorizes functionality, and identifies use cases
2. **Test Planning**: Creates specific test scenarios based on analysis and user input
3. **Code Generation**: Generates complete, executable test code using Scout framework

### 📚 Diverse Test Examples
Includes varied examples for different plugin categories:
- **API Tests**: Data management, security, configuration
- **UI Tests**: Dashboard, data exploration, management, visualization

### 🔧 Enhanced Prompt Engineering
- **Explicit Instructions**: Prompts reference Elastic documentation and best practices
- **Rationale Requests**: LLM explains test scenario choices and approaches
- **Few-shot Learning**: Uses diverse examples to guide generalized thinking
- **Context-Aware**: Considers plugin complexity and specific user requirements

## Usage

### Basic Usage
```bash
node scripts/generate_scout_tests.js
```

### Interactive Prompts
The script will guide you through:
1. Plugin path specification
2. Plugin purpose and feature description
3. Test type selection (UI/API/both)
4. Complexity level setting
5. User interaction patterns (for UI tests)
6. API endpoint descriptions (for API tests)

### Example Session
```
🚀 Kibana Plugin Test Generator
================================

Enter the relative path to the Kibana plugin directory: x-pack/plugins/my_plugin

Describe the main purpose of this plugin: data visualization for metrics

List the key features of this plugin:
> Real-time chart updates
> Custom metric aggregations
> Dashboard integration
> done

Which types of tests would you like to generate? (ui, api, both) [both]: both

Plugin complexity level? (simple, medium, complex) [medium]: medium

Describe typical user interactions with this plugin:
> Create new visualization
> Configure chart settings
> Apply filters
> done

List API endpoints or functionality this plugin provides:
> GET /api/metrics/data
> POST /api/metrics/aggregation
> done

📊 Plugin Analysis Summary:
Purpose: data visualization for metrics
Features: Real-time chart updates, Custom metric aggregations, Dashboard integration
Test Types: ui, api
Complexity: medium

Proceed with test generation? (y/n) [y]: y

🔄 Generating tests...

🔍 Step 1: Analyzing plugin characteristics...
📋 Step 2: Creating UI test plan...
⚡ Step 3: Generating test code...
✅ Generated 4 test scenarios for ui testing

🔍 Step 1: Analyzing plugin characteristics...
📋 Step 2: Creating API test plan...
⚡ Step 3: Generating test code...
✅ Generated 3 test scenarios for api testing

Test generated and saved to: x-pack/plugins/my_plugin/test/scout/ui/index.spec.ts
Test generated and saved to: x-pack/plugins/my_plugin/test/scout/api/index.spec.ts
```

## Architecture

### Core Components

#### `MultiStepTestGenerator`
Main orchestrator that implements the 3-step process:
- `analyzePlugin()`: Analyzes plugin characteristics
- `generateTestPlan()`: Creates detailed test scenarios
- `generateTestCode()`: Produces executable test code

#### `TestExamples`
Provides diverse test patterns categorized by:
- Plugin functionality (dashboard, security, data, etc.)
- Test complexity levels
- Common interaction patterns

#### Enhanced CLI (`tests_llm_generator.ts`)
Interactive interface with:
- Multi-line input support
- Validation and confirmation steps
- Progress tracking and feedback
- Error handling and fallbacks

### File Structure
```
src/dev/scout/
├── tests_llm_generator.ts     # Enhanced CLI interface
├── test_generator.ts          # Main test generation logic
├── multi_step_prompting.ts    # Multi-step LLM workflow
├── test_examples.ts           # Diverse test patterns
├── llm_client.ts             # LLM API communication
├── file_utils.ts             # File system utilities
├── code_utils.ts             # Code processing utilities
└── README.md                 # Documentation
```

## Generated Test Quality

### API Tests
- Proper authentication setup with role-based credentials
- Comprehensive error handling and status code validation
- Realistic API endpoint interactions
- Data validation and response structure checks

### UI Tests
- Page object pattern usage
- Proper browser authentication flow
- Element interaction and state validation
- Realistic user workflows and edge cases

### Code Quality Features
- TypeScript type safety
- Scout framework best practices
- Deployment-agnostic test tags
- Descriptive test names and documentation
- Error handling and cleanup

## Advanced Features

### Fallback Mechanisms
- Legacy test generation for backward compatibility
- Error recovery with simpler prompting approaches
- Graceful degradation when LLM services are unavailable

### Customization
- Configurable LLM model selection
- Adjustable test complexity levels
- Plugin-specific prompt customization
- Category-based example selection

## Requirements

- Node.js and npm
- Access to LLM service (default: Ollama at localhost:11434)
- Kibana development environment
- Valid plugin with `kibana.jsonc` configuration

## Contributing

When extending the generator:
1. Add new test examples to `test_examples.ts`
2. Enhance prompts in `multi_step_prompting.ts`
3. Update CLI interface in `tests_llm_generator.ts`
4. Maintain backward compatibility in `test_generator.ts`

## Troubleshooting

### Common Issues
- **LLM Connection**: Ensure Ollama service is running on localhost:11434
- **Plugin Path**: Verify the relative path from Kibana root directory
- **Empty Tests**: Check plugin configuration and source file availability
- **Linting Errors**: Generated tests may need manual formatting adjustments
