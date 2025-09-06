# Web Search Integration for Kibana Test Generation

This enhancement replaces hardcoded categorization with dynamic web searches to get proper Kibana feature descriptions, allowing users to confirm or adjust descriptions before generating tests.

## Features

- 🔍 **Web Search Integration**: Automatically searches for real Kibana feature documentation
- 👤 **User Confirmation**: Interactive prompts for users to confirm or adjust descriptions
- 🔄 **Fallback Mechanism**: Falls back to LLM simulation if web search fails
- 🚀 **Production Ready**: Supports real web search APIs (Google Custom Search, etc.)

## How It Works

### 1. Web Search Phase
When analyzing a plugin, the system:
- Creates a search query: `"Kibana {pluginName} {purpose} feature documentation Elastic Stack"`
- Searches the web for official documentation
- Extracts structured information about the feature

### 2. User Confirmation Phase
The system presents search results to the user:
```
🔍 Web Search Result:
📝 Description: The Kibana Console is an interactive development tool that allows users to send requests to Elasticsearch directly from the Kibana interface...
📂 Category: Console
🔧 Key Features: Interactive query editor, Elasticsearch API testing, Syntax highlighting
🔍 Search Query: Kibana console dev tools feature documentation Elastic Stack

✅ Is this description accurate? (y/n) or provide your own description:
```

### 3. Enhanced Test Generation
- Uses the confirmed description for better analysis
- Generates more accurate test scenarios
- Maintains all existing fallback mechanisms

## Usage

### Basic Usage
```typescript
import { MultiStepTestGenerator } from './multi_step_prompting';

const generator = new MultiStepTestGenerator();
const testFiles = await generator.generateFullTest(pluginDetails, pluginMeta, 'ui');
```

### With Real Web Search (Optional)
Set environment variables for production use:
```bash
export GOOGLE_SEARCH_API_KEY="your-api-key"
export GOOGLE_SEARCH_ENGINE_ID="your-search-engine-id"
```

## Configuration

### Environment Variables
- `GOOGLE_SEARCH_API_KEY`: Google Custom Search API key (optional)
- `GOOGLE_SEARCH_ENGINE_ID`: Custom Search Engine ID (optional)

If not configured, the system uses LLM simulation as fallback.

### Supported Search APIs
The framework is designed to support multiple search providers:
- Google Custom Search API (example implementation provided)
- Bing Search API (easily pluggable)
- DuckDuckGo API (easily pluggable)
- Any other search API (easily pluggable)

## Example Workflow

### Console Plugin Example
```typescript
// Input
const pluginDetails = {
  purpose: 'console app in dev tools for elasticsearch queries',
  features: ['query editor', 'elasticsearch api'],
  // ... other details
};

// 1. Web search finds: "Interactive development tool for Elasticsearch queries..."
// 2. User confirms or adjusts the description
// 3. Enhanced analysis uses real feature information
// 4. Generates accurate Console-category tests
```

## Benefits

### Before (Hardcoded)
```typescript
// Hardcoded categorization
if (purpose.includes('console')) {
  fallbackCategory = 'Console';
}
```

### After (Web Search + User Confirmation)
```typescript
// Real feature descriptions from web search
const searchResult = await searchKibanaFeature(pluginName, purpose);
const confirmedDescription = await confirmFeatureDescription(searchResult);
// Generate tests based on real feature information
```

## Implementation Details

### File Structure
- `multi_step_prompting.ts`: Main implementation with web search integration
- `web_search_demo.ts`: Demo script showing the workflow
- `README_WEB_SEARCH.md`: This documentation

### Key Methods
- `searchKibanaFeature()`: Performs web search for feature information
- `performRealWebSearch()`: Handles real API integration (pluggable)
- `confirmFeatureDescription()`: Interactive user confirmation
- `analyzePlugin()`: Enhanced analysis using web search results

### Error Handling
- Web search failures fall back to LLM simulation
- LLM simulation failures fall back to hardcoded categorization
- All original fallback mechanisms preserved

## Testing the Feature

Run the demo script:
```bash
cd src/dev/scout
npx ts-node web_search_demo.ts
```

This will demonstrate the complete workflow with example plugins.

## Future Enhancements

- Add more search providers (Bing, DuckDuckGo)
- Cache search results for repeated queries
- Add search result ranking and filtering
- Support for multilingual documentation
- Integration with Elastic's own documentation API
