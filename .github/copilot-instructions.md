Kibana is a TypeScript codebase. Provide examples or suggestions in TypeScript whenever possible.

Ensure that:
* Any string value containing `/` that may be used as an HTTP API path should be in snake case. For example, `/api/myDomain/myApi` should be `/api/my_domain/my_api`, `/internal/myRoute` should be `/internal/my_route`. Also if containing a variable name like: `${API_BASE_PATH}/find-something` should be `${API_BASE_PATH}/find_something`. Do not consider code imports like `import ... from '@kbn/test';` as potential HTTP API paths.
