Kibana is a TypeScript codebase. Provide examples or suggestions in TypeScript whenever possible.

Identify all HTTP API registrations in this file that follow these patterns:
- router.(head|get|put|post|patch|delete)({ path: '/api/my_api', options: { access: '...' }, }, (ctx, req, res) => {...});
- router.versioned.(head|get|put|post|patch|delete)({ path: '/api/my_api', access: '...', }).addVersion({ version: '...' }, (ctx, req, res) => {...});
Check if
- all path segments are use snake case for example  `/api/myDomain/myApi` should be `/api/my_domain/my_api`, refer author to docs https://docs.elastic.dev/kibana-dev-docs/contributing/http-api-guidelines#path
- an API changes "access" from "internal" to "public" comment on the affected lines asking authors to read this documentation: https://docs.elastic.dev/kibana-dev-docs/contributing/http-api-guidelines#commitment
