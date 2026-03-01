# Script Panel

A dashboard embeddable that executes user-authored JavaScript code in a sandboxed iframe environment.

## Overview

The Script Panel plugin provides a scriptable visualization panel for Kibana dashboards. User code runs in an isolated iframe with `sandbox="allow-scripts"`, preventing direct access to the parent Kibana application or the DOM.

## Security Model

- **Iframe sandbox**: Code executes in an iframe with `sandbox="allow-scripts"` (no `allow-same-origin`)
- **Capability-based API**: Scripts can only interact with Kibana through explicit RPC methods
- **ES|QL-only data access**: Data fetching is restricted to ES|QL queries with dashboard context
- **No direct network access**: The iframe's CSP blocks external network requests

## Usage

Script panels can be added to dashboards via:
1. The "Add panel" menu in dashboard edit mode
2. AI assistant tools that generate and update panel code

## API (Planned)

The script runtime will expose a limited capability API:
- `esql.query({ query, params?, useContext? })` - Execute ES|QL queries
- `panel.getSize()` - Get current panel dimensions
- `render.setContent(html)` - Set panel HTML content
- `log.info/warn/error(...)` - Structured logging
