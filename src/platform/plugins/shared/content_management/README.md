# Content management

The content management plugin provides functionality to manage content in Kibana.


## Testing

Many parts of the Content Management service are implemented *in-memory*, hence it
is possible to test big chunks of the Content Management plugin using Jest
tests.


### Elasticsearch Integration tests

Some functionality of the Content Management plugin can be tested using *Kibana
Integration Tests*, which execute tests against a real Elasticsearch instance.

Run integrations tests with:

```
yarn test:jest_integration src/platform/plugins/shared/content_management
```
