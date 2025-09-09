# @kbn/core-pricing-server-mocks

Mock implementations for Kibana's core pricing server services. This package provides Jest mocks for testing components that depend on pricing-related server functionality.

## Overview

Provides mock implementations of pricing server contracts for unit testing purposes, enabling testing of features that depend on pricing logic without requiring actual pricing service integration.

## Package Details

- **Package Type**: `server-mocks`
- **Owner**: `@elastic/kibana-core`
- **Purpose**: Testing utilities for pricing server functionality

## Core Mocks

### pricingServiceMock
Mock implementations for pricing service contracts including setup and start phases.

## Usage

```typescript
import { pricingServiceMock } from '@kbn/core-pricing-server-mocks';

const pricingSetup = pricingServiceMock.createSetupContract();
const pricingStart = pricingServiceMock.createStartContract();
```

## Integration

Used in unit tests for features that depend on pricing calculations, subscription validation, or license-based functionality.
