# @kbn/shared-ux-page-no-data-mocks

Mock implementations for SharedUX no-data page components. This package provides Jest mocks for testing components that use no-data page functionality.

## Overview

Provides mock implementations of no-data page components for unit testing purposes, enabling testing without actual no-data state setup.

## Package Details

- **Package Type**: `shared-mocks`
- **Purpose**: Testing utilities for no-data page components
- **Integration**: Used in unit tests for no-data scenarios

## Usage

```typescript
import { noDataPageMocks } from '@kbn/shared-ux-page-no-data-mocks';

const mockNoDataPage = noDataPageMocks.createComponent();
```
