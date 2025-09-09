# @kbn/reporting-mocks-server

Mock implementations for Kibana's reporting server services. This package provides Jest mocks for testing components that depend on server-side reporting functionality.

## Overview

Provides mock implementations of reporting server contracts for unit testing purposes, enabling testing of features that depend on reporting services without requiring actual report generation.

## Package Details

- **Package Type**: `server-mocks`
- **Purpose**: Testing utilities for reporting server functionality
- **Dependencies**: Jest mocking framework

## Core Mocks

### reportingServiceMock
Mock implementations for reporting service contracts including setup and start phases, report generation, and export functionality.

## Usage

```typescript
import { reportingServiceMock } from '@kbn/reporting-mocks-server';

const reportingSetup = reportingServiceMock.createSetupContract();
const reportingStart = reportingServiceMock.createStartContract();
```

## Integration

Used in unit tests for features that depend on report generation, export functionality, or reporting service integration.
