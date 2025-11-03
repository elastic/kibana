# One Console

## What is One Console?

One Console is a standalone, packaged version of the Kibana Console plugin that can be embedded into external applications as a React component.

Instead of requiring the full Kibana platform, One Console bundles all necessary dependencies using Webpack, making it possible to integrate the Console's powerful Elasticsearch query editor and execution capabilities into any React application.

### Key Features

- **Standalone React Component**: Can be imported and used in any React application without Kibana dependencies
- **Request Parsing**: Intelligently parses Elasticsearch API requests (method, URL, and body)
- **Autocomplete Support**: Includes Elasticsearch API autocomplete functionality
- **Internationalization**: Supports multiple languages (en, fr-FR, ja-JP, zh-CN)
- **HTTP Integration**: Allows custom HTTP clients and notification handlers to be injected

### Usage

```tsx
import { OneConsole } from 'one-console';

<OneConsole
  lang="en"
  http={customHttpClient}
  notifications={customNotificationHandlers}
/>
```

### Architecture

One Console mocks several Kibana core services (analytics, theme, i18n, doc links, etc.) to provide a self-contained environment. It uses:

- `@kbn/monaco` for the Monaco editor integration
- Kibana core services (HTTP, theme, i18n) initialized in standalone mode
- Local storage for history and settings persistence
- Custom parser for Elasticsearch request syntax

## StandaloneParsedRequestsProvider

### Overview

The `StandaloneParsedRequestsProvider` is a critical component that enables One Console to parse and understand Elasticsearch API requests typed into the Monaco editor. It provides the same interface as Kibana's `ConsoleParsedRequestsProvider` but operates independently without requiring the full Kibana plugin context.

### What It Does

The provider analyzes the text content of the Monaco editor and extracts structured information about Elasticsearch requests, including:

1. **HTTP Method** (GET, POST, PUT, DELETE, etc.)
2. **API Endpoint** (URL/path)
3. **Request Body** (JSON data)
4. **Character Offsets** (start and end positions in the editor)
5. **Syntax Errors** (parsing errors with location information)

### How It Works

```
Editor Text → StandaloneConsoleParser → ParsedRequest[]
                                      → ParseError[]
```

1. The provider receives a reference to the Monaco editor model
2. When `getRequests()` or `getErrors()` is called, it reads the current text from the model
3. It passes the text through the console parser from `@kbn/monaco`
4. The parser tokenizes and analyzes the Console-specific syntax
5. It returns structured data about each request found in the editor

### Why It's Needed

In the full Kibana environment, the Console plugin has access to the Monaco language service workers and parser infrastructure. However, One Console runs in external applications where these services may not be available. The `StandaloneParsedRequestsProvider` bridges this gap by providing a self-contained parsing solution that works in any environment where Monaco editor can run.