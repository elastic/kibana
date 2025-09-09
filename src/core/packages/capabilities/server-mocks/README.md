# @kbn/core-capabilities-server-mocks

Mock implementations for Kibana's core capabilities server services. This package provides Jest mocks for testing components that depend on the capabilities server functionality.

## Overview

Provides mock implementations of capabilities server contracts (`CapabilitiesSetup` and `CapabilitiesStart`) for unit testing purposes.

## Package Details

- **Package Type**: `server-mocks` 
- **Owner**: `@elastic/kibana-core`
- **Purpose**: Testing utilities for capabilities server

## Core Mocks

### capabilitiesServiceMock
- `createSetupContract()` - Mock CapabilitiesSetup with Jest functions
- `createStartContract()` - Mock CapabilitiesStart with Jest functions

## Usage

```typescript
import { capabilitiesServiceMock } from '@kbn/core-capabilities-server-mocks';

const capabilitiesSetup = capabilitiesServiceMock.createSetupContract();
const capabilitiesStart = capabilitiesServiceMock.createStartContract();
```
