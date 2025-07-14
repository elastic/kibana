Kibana is a TypeScript codebase. Provide examples or suggestions in TypeScript whenever possible.

The following rules must be enforced:
* Any string value containing `/` that may be used as an HTTP API path should be snake case. For example, `/api/myDomain/myApi` should be `/api/my_domain/my_api`, `/internal/myRoute` should be `/internal/my_route`. Also; `${API_BASE_PATH}/find-something` should be `${API_BASE_PATH}/find_something`. Also values in an object like; `path: '/api/myApi'` should be `path: '/api/my_api'`.
