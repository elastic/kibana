# Testing Kibana Plugins

This document outlines best practices and patterns for testing Kibana Plugins.

- [Strategy](#strategy)
- [Core Integrations](#core-integrations)
  - [Core Mocks](#core-mocks)
  - [Strategies for specific Core APIs](#strategies-for-specific-core-apis)
      - [HTTP Routes](#http-routes)
      - [SavedObjects](#savedobjects)
      - [Elasticsearch](#elasticsearch)
- [Plugin Integrations](#plugin-integrations)
- [Plugin Contracts](#plugin-contracts)

## Strategy

In general, we recommend three tiers of tests:
- Unit tests: small, fast, exhaustive, make heavy use of mocks for external dependencies 
- Integration tests: higher-level tests that verify API behavior through sending real HTTP requests to Kibana server
  - **TODO: what's the equivalent of integration tests for frontend code? Karma replacement?**
- Functional tests: full end-to-end tests that verify user-facing behavior through the browser

These tiers should roughly follow the traditional "testing pyramid", where there are more exhaustive testing at the unit level, fewer at the integration level, and very few at the functional level. 

## Core Integrations

### Core Mocks

When testing a plugin's integration points with Core APIs, it is heavily recommended to utilize the mocks provided in `src/core/server/mocks` and `src/core/public/mocks`. The majority of these mocks are dumb `jest` mocks that mimic the interface of their respective Core APIs, however they do not return realistic return values.

If the unit under test expects a particular response from a Core API, the test will need to set this return value explicitly. The return values are type checked to match the Core API where possible to ensure that mocks are updated when Core APIs changed.

#### Example

```typescript
import { elasticsearchServiceMock } from 'src/core/server/mocks';

test('my test', async () => {
  // Setup mock and faked response
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  esClient.callAsCurrentUser.mockResolvedValue(/** insert ES response here */);

  // Call unit under test with mocked client
  const result = await myFunction(esClient);

  // Assert that client was called with expected arguments
  expect(esClient.callAsCurrentUser).toHaveBeenCalledWith(/** expected args */);
  // Expect that unit under test returns expected value based on client's response
  expect(result).toEqual(/** expected return value */)
});
```

### Strategies for specific Core APIs

#### HTTP Routes

_How to test route handlers_

#### SavedObjects

_How to test SO operations_

#### Elasticsearch

_How to test ES clients_

## Plugin Integrations

_How to test against specific plugin APIs (eg. data plugin)_

## Plugin Contracts

_How to test your plugin's exposed API_
