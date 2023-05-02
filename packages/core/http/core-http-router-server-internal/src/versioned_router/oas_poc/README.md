# OpenAPI spec Proof-of-Concept

With this PoC we want to explore the possibility of using the versioned router
interface to generate high quality OAS spec for Kibana's public HTTP APIs.

## Running PoC

```
node ./packages/core/http/core-http-router-server-internal/src/versioned_router/oas_poc/run.js
```

Then paste the terminal output into an online OAS editor like https://editor.swagger.io/ to test it out.