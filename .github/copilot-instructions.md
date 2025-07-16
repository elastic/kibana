HTTP API paths should be snake case (https://docs.elastic.dev/kibana-dev-docs/contributing/http-api-guidelines#path):
- this "path: '/api/myPath'"
  should be "/api/my_path"
- this "${BASE_PATH}/myPath"
  should be "/api/my_path"
- this "path: '/api/my__path'"
  should be "/api/my_path"

Always link to appropriate docs whenever possible.