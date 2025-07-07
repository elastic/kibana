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

### Connector configuration sources

`@kbn/gen-ai-functional-testing` can discover connectors from two different sources:

1. **CI / automated runs** – set the environment variable  
   `KIBANA_TESTING_AI_CONNECTORS` with the base-64-encoded JSON payload that you
   want to feed into `xpack.actions.preconfigured`. This is what the Buildkite
   pipeline does.
2. **Local developer machines** – if the environment variable is **not** set and
   the process is **not** running in CI (`process.env.CI` is undefined), the
   package falls back to reading `config/kibana.dev.yml` in the repo root and
   extracts the `xpack.actions.preconfigured` section. This lets you keep your
   personal connector secrets out of env vars.

If the env var is missing **and** the code is executing in CI, an error is
thrown to avoid silent mis-configuration.

### Typical workflow

1. **Local development**  
   Add your connector definition to `config/kibana.dev.yml`:

   ```yaml
   xpack.actions.preconfigured:
     my-gpt-4o:
       name: GPT-4o Azure
       actionTypeId: .gen-ai
       config:
         apiUrl: https://.../chat/completions?api-version=2025-01-01-preview
         apiProvider: Azure OpenAI
       secrets:
         apiKey: <YOUR_KEY>
   ```

2. **CI**  
   Generate the same YAML as JSON, base-64 encode it and export as
   `KIBANA_TESTING_AI_CONNECTORS` before running the FTR suite.

If one of these sources is available, the `getAvailableConnectors` can be used during the test suite to retrieve the list of LLM connectors.

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
