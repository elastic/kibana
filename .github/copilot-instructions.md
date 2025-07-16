Identify all HTTP API registrations in this file that match:
- (head|get|put|post|patch|delete)({ path: ..., options: { access: ... }, }, (ctx, req, res) => {...});
- versioned.(head|get|put|post|patch|delete)({ path: ..., access: ... }).addVersion({ version: '...' }, (ctx, req, res) => {...});
Check if
- "path:" value is an HTTP path using snake case. For example `/api/myDomain/myApi` should be `/api/my_domain/my_api`, refer author to docs https://docs.elastic.dev/kibana-dev-docs/contributing/http-api-guidelines#path
- an API changes "access" from "internal" to "public" comment on the affected lines asking authors to read this documentation: https://docs.elastic.dev/kibana-dev-docs/contributing/http-api-guidelines#commitment
