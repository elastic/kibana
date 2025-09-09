# @kbn/cypress-config

Cypress configuration utilities for Kibana testing. This package provides standardized Cypress configuration and setup for end-to-end testing in Kibana development.

## Overview

Contains Cypress configuration utilities and setup helpers for consistent end-to-end testing across Kibana projects and plugins.

## Package Details

- **Package Type**: `shared-common`
- **Purpose**: Cypress configuration and setup utilities
- **Integration**: Used by Cypress test configurations

## Usage

```javascript
// cypress.config.js
const { cypressConfig } = require('@kbn/cypress-config');

module.exports = cypressConfig({
  // Custom configuration
});
```
