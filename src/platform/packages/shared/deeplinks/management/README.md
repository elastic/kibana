# @kbn/deeplinks-management

Deep link definitions for Kibana Management features. This package provides deep link configurations and navigation utilities specifically for management functionality.

## Overview

Contains deep link definitions for Kibana's Management section, enabling direct navigation to specific management features and settings.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Management deep link definitions
- **Integration**: Used by navigation and deep linking systems

## Usage

```typescript
import { managementDeepLinks } from '@kbn/deeplinks-management';

// Navigate to specific management feature
router.navigate(managementDeepLinks.indexPatterns);
```
