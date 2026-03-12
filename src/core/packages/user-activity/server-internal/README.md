# @kbn/core-user-activity-server-internal

This package contains the internal implementation for Core's server-side user activity service.

See [@kbn/core-user-activity-server](../server/README.md) for usage documentation.

## Context Injection

The service uses `AsyncLocalStorage` to maintain request-scoped context. HTTP middleware injects user, session, and space information during the request lifecycle, which is then automatically included in all tracked actions.
