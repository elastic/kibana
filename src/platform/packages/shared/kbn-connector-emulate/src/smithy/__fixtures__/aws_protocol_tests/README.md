# AWS protocol test fixtures

`aws_json_protocol_tests.test.ts` runs the awsJson1_0 and awsJson1_1 protocol compliance tests that AWS publishes with Smithy (`@httpRequestTests` and `@httpResponseTests`, in [`smithy-aws-protocol-tests`](https://github.com/smithy-lang/smithy/tree/main/smithy-aws-protocol-tests)) against the emulator. It runs the tests that apply to servers (`appliesTo` unset or `server`): request tests must reach their operation without violations, and response tests' bodies must pass response validation.

| File | What it is |
| --- | --- |
| `json10.smithy.json` | The `aws.protocoltests.json10#JsonRpc10` test service (awsJson1_0) and its test cases |
| `json11.smithy.json` | The `aws.protocoltests.json#JsonProtocol` test service (awsJson1_1) and its test cases |
| `smithy-build.json` | The build that produced both |

Each model keeps the shapes the service reaches, in the `aws.protocoltests.*` namespaces, without documentation. Produced with Smithy CLI 1.74.1 and `software.amazon.smithy:smithy-aws-protocol-tests:1.74.1`.

## Regenerating

1. Install the Smithy CLI: `brew tap smithy-lang/tap && brew install smithy-cli`.
2. In an empty directory, copy `smithy-build.json`, and add a `model/` directory with an empty model (`$version: "2"` and a `namespace`), since the tests come from the Maven dependency.
3. Run `smithy build`.
4. For each projection, keep only the test shapes:

   ```sh
   jq --indent 1 'del(.metadata) | .shapes |= with_entries(select(.key | startswith("aws.protocoltests.")))' \
     build/smithy/json10/model/model.json > json10.smithy.json
   ```
