# <%= name %>

<%- (description || '').split('\n').map(function (line) {
  return '> ' + line
}).join('\n') %>

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions setting up your development environment.
