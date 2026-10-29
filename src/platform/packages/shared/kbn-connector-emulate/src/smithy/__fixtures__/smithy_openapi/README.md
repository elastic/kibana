# smithy-openapi fixtures

`smithy_openapi_parity.test.ts` compares `convertSmithy` with [smithy-openapi](https://smithy.io/2.0/guides/model-translations/converting-to-openapi.html), AWS's own conversion of Smithy models to OpenAPI, for the operations the EKS, Lambda and X-Ray connectors call. The Smithy CLI is only needed to regenerate these files, not to run the test.

| File | What it is |
| --- | --- |
| `<service>.smithy.json` | The service's model, reduced to the operations the connector calls and the shapes they reach, without documentation, examples, waiters, smoke tests and endpoint rules, and without shapes outside the service's namespace (trait definitions) |
| `<service>.openapi.json` | smithy-openapi's conversion of that reduced model |
| `smithy-build.json` | The build that produced both, with the operations per service |

Produced with Smithy CLI 1.74.1 (with smithy-openapi 1.74.1) from [`aws/api-models-aws`](https://github.com/aws/api-models-aws) at commit `6ff5afb58cb722e421a0b4dd0012699f772bd1cc`:

- `models/eks/service/2017-11-01/eks-2017-11-01.json`
- `models/lambda/service/2015-03-31/lambda-2015-03-31.json`
- `models/xray/service/2016-04-12/xray-2016-04-12.json`

## Regenerating

1. Install the Smithy CLI: `brew tap smithy-lang/tap && brew install smithy-cli`.
2. In an empty directory, copy `smithy-build.json` and download the three models into `model/`.
3. Run `smithy build`. When a connector calls other operations, update the operation names in both selectors of its projection first.
4. For each service, copy `build/smithy/<service>/openapi/<Service>.openapi.json` to `<service>.openapi.json`, and `build/smithy/<service>/model/model.json` to `<service>.smithy.json`, keeping only the shapes in the service's namespace:

   ```sh
   jq --indent 1 'del(.metadata) | .shapes |= with_entries(select(.key | startswith("com.amazonaws.eks#")))' \
     build/smithy/eks/model/model.json > eks.smithy.json
   ```
