# @kbn/cypress-test-helper

Helper utilities for Cypress end-to-end testing in Kibana. This package provides common utilities, commands, and helpers for writing consistent Cypress tests.

## Overview

Contains utilities and helper functions for Cypress end-to-end testing, providing standardized testing patterns and commands for Kibana applications.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Cypress testing utilities and helpers
- **Integration**: Used by Cypress test suites

## Core Features

### Custom Commands
- Kibana-specific Cypress commands
- Common interaction patterns
- Test setup and teardown utilities

### Test Utilities
- Data fixture helpers
- Authentication utilities
- Navigation and routing helpers

## Usage

```typescript
import { kibanaTestHelpers } from '@kbn/cypress-test-helper';

// In Cypress tests
cy.loginToKibana();
cy.navigateToApp('discover');
```

## Integration

Used across Kibana's Cypress test suites to provide consistent testing utilities and reduce test maintenance overhead.
