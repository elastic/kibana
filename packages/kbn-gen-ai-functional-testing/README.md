# @kbn/gen-ai-functional-testing

Package exposing various utilities for GenAI/LLM related functional testing.

## Features

### LLM connectors

Utilizing LLM connectors on FTR tests can be done via the `getPreconfiguredConnectorConfig` and `getAvailableConnectors` tools.

`getPreconfiguredConnectorConfig` should be used to define the list of connectors when creating the FTR test's configuration.

```ts
import { getPreconfiguredConnectorConfig } from '@kbn/gen-ai-functional-testing'

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = {...};
  const preconfiguredConnectors = getPreconfiguredConnectorConfig();

  return {
    ...xpackFunctionalConfig.getAll(),
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.actions.preconfigured=${JSON.stringify(preconfiguredConnectors)}`,
      ],
    },
  };
}
```

then the `getAvailableConnectors` can be used during the test suite to retrieve the list of LLM connectors.

For example to run some predefined test suite against all exposed LLM connectors:

```ts
import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';

export default function (providerContext: FtrProviderContext) {
  describe('Some GenAI FTR test suite', async () => {
    getAvailableConnectors().forEach((connector) => {
      describe(`Using connector ${connector.id}`, () => {
        myTestSuite(connector, providerContext);
      });
    });
  });
}
```
