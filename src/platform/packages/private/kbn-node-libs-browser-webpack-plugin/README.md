# @kbn/node-libs-browser-webpack-plugin

Webpack plugin for providing Node.js library polyfills in browser environments. This package supplies a Webpack plugin that makes Node.js core modules available in browser builds of Kibana.

## Overview

Provides a Webpack plugin that polyfills Node.js core libraries for browser environments, enabling code that uses Node.js modules to run in the browser.

## Package Details

- **Package Type**: `private` (platform internal)
- **Purpose**: Node.js polyfills for browser builds
- **Dependencies**: Webpack plugin ecosystem

## Core Functionality

### Browser Polyfills
Provides browser-compatible implementations of Node.js core modules including:
- `path`, `url`, `util`
- `events`, `stream`
- `crypto`, `buffer`
- Other Node.js standard libraries

## Usage

```javascript
// webpack.config.js
const NodeLibsBrowserPlugin = require('@kbn/node-libs-browser-webpack-plugin');

module.exports = {
  plugins: [
    new NodeLibsBrowserPlugin()
  ]
};
```

## Integration

Essential for Kibana's browser builds to ensure compatibility with code that uses Node.js modules.
