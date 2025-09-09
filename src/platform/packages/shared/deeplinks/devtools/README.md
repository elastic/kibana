# @kbn/deeplinks-devtools

Deep link definitions for Kibana DevTools features. This package provides deep link configurations for developer tools including Console, Profiler, and other development utilities.

## Overview

Contains deep link definitions for Kibana's DevTools section, enabling direct navigation to specific developer tools and features.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: DevTools deep link definitions
- **Integration**: Used by navigation and developer workflows

## Usage

```typescript
import { devToolsDeepLinks } from '@kbn/deeplinks-devtools';

// Navigate to specific DevTools feature
router.navigate(devToolsDeepLinks.console);
```
