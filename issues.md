# Remote Host Steps — Review Findings

## Tests

**T1 — `parseScriptOutput` has zero test coverage**
File: [remote_host_run_command_step.ts:27](src/platform/plugins/shared/workflows_extensions/server/steps/remote_host/remote_host_run_command_step.ts#L27)
All four branches (`undefined`→`null`, `""`→`null`, valid JSON→object, invalid JSON→raw string) are completely unexercised.

**T2 — `execAsync`: RUNNING path, EXIT trap, and file collection untested**
File: [ssh_host_connector.ts:103](x-pack/platform/plugins/shared/stack_connectors/server/connector_types/ssh_host/ssh_host_connector.ts#L103)
No test covers the 2-second synchronous polling window (DONE vs RUNNING), the EXIT trap writing `output.txt` when `$STEP_OUTPUT` is set, or the `FILES=` key collection used by `downloadFile`.

**T3 — `killExec` silent branch when `pid.txt` doesn't exist**
File: [ssh_host_connector.ts:307](x-pack/platform/plugins/shared/stack_connectors/server/connector_types/ssh_host/ssh_host_connector.ts#L307)
When `pid.txt` is missing the script skips `kill -9` but still runs `rm -rf`; this path is never asserted.

**T4 — `parseHost` edge cases untested**
File: [ssh_host_connector.ts:51](x-pack/platform/plugins/shared/stack_connectors/server/connector_types/ssh_host/ssh_host_connector.ts#L51)
No tests for: hostname with no colon (default port 22), port 0/65536 (should fall back to 22), multi-colon strings (IPv6-style inputs).

**T5 — RUNNING→terminated transition and non-zero exit untested**
File: [remote_host_run_command_step.ts:72](src/platform/plugins/shared/workflows_extensions/server/steps/remote_host/remote_host_run_command_step.ts#L72)
`start()` returning a running state followed by `poll()` converging to done is untested. Neither is the `ExecutionError` thrown on non-zero exit in either phase.

**T6 — `onCancel` with undefined state untested**
File: [remote_host_run_command_step.ts:130](src/platform/plugins/shared/workflows_extensions/server/steps/remote_host/remote_host_run_command_step.ts#L130)
The early-return guard `if (!state?.commandId)` that skips `killCommandInConnector` has no test.

**T7 — `executeSubAction` error path untested**
File: [execute_in_connector.ts:47](src/platform/plugins/shared/workflows_extensions/server/steps/remote_host/execute_in_connector.ts#L47)
The branch where `result.status === 'error'` throws `ExecutionError('ConnectorExecutionError')` is never covered.

---

## Docs

**D1 — `runCommand` description says "return its output" but stdout goes to logs**
File: [remote_host_run_command_step.ts:44](src/platform/plugins/shared/workflows_extensions/common/steps/remote_host/remote_host_run_command_step.ts#L44)
Description reads *"Execute a shell command … and return its output"*. Actual behavior: stdout/stderr are logged; output is `null` unless the script explicitly sets `STEP_OUTPUT`.

**D2 — `downloadFile` says "Text content" with no warning about binary files**
File: [remote_host_download_file_step.ts:70](src/platform/plugins/shared/workflows_extensions/common/steps/remote_host/remote_host_download_file_step.ts#L70)
The server decodes as UTF-8; downloading a binary file silently produces garbled output. The doc never says the file must be text.

**D3 — `downloadFile` omits the effective ~75 MB size ceiling**
File: [remote_host_download_file_step.ts:47](src/platform/plugins/shared/workflows_extensions/common/steps/remote_host/remote_host_download_file_step.ts#L47)
The SSH transport has a 100 MB `maxBuffer` and the file travels as base64, giving ~75 MB practical ceiling. Not mentioned.

**D4 — `uploadFile` omits size limit; `content` has no `.max()` bound in schema**
File: [remote_host_upload_file_step.ts:65](src/platform/plugins/shared/workflows_extensions/common/steps/remote_host/remote_host_upload_file_step.ts#L65)
`content` is `z.string()` with no maximum. Same ~75 MB SSH ceiling applies but isn't documented or enforced in the schema.

**D5 — `runCommand` doc omits the 32 KB limit on `code`**
File: [remote_host_run_command_step.ts:81](src/platform/plugins/shared/workflows_extensions/common/steps/remote_host/remote_host_run_command_step.ts#L81)
The inputs section describes `code` without mentioning `REMOTE_HOST_COMMAND_TEMPLATE_MAX_CHARS` (32 768 bytes) enforced by the schema.

---

## Naming

**N1 — `remoteHost.runCommand` implies one command; it runs a shell script**
File: [remote_host_run_command_step.ts:15](src/platform/plugins/shared/workflows_extensions/common/steps/remote_host/remote_host_run_command_step.ts#L15)
The input field is named `code`, the docs say "Shell script", and the connector wraps it in a `#!/bin/bash` harness. `remoteHost.runScript` would match.

**N2 — `REMOTE_HOST_COMMAND_TEMPLATE_MAX_CHARS` — "COMMAND_TEMPLATE" is not a concept anywhere else**
File: [remote_host_run_command_step.ts:17](src/platform/plugins/shared/workflows_extensions/common/steps/remote_host/remote_host_run_command_step.ts#L17)
This limits the `code` field (a shell script body). `REMOTE_HOST_SCRIPT_MAX_CHARS` or `REMOTE_HOST_CODE_MAX_CHARS` would be accurate.

**N3 — `parseScriptOutput` parses `STEP_OUTPUT` (a file), not script stdout**
File: [remote_host_run_command_step.ts:27](src/platform/plugins/shared/workflows_extensions/server/steps/remote_host/remote_host_run_command_step.ts#L27)
"Script output" conventionally means stdout, but this function parses `output.txt` written by the EXIT trap. `parseStepOutput` would be precise.

**N4 — `getCommandData` only returns file paths**
File: [ssh_host_connector.ts:486](x-pack/platform/plugins/shared/stack_connectors/server/connector_types/ssh_host/ssh_host_connector.ts#L486)
Returns five constant path strings. `getCommandPaths` or `buildCommandFilePaths` would be accurate.

**N5 — `executeCommandInConnector` implies synchronous completion but may return RUNNING**
File: [execute_in_connector.ts:59](src/platform/plugins/shared/workflows_extensions/server/steps/remote_host/execute_in_connector.ts#L59)
The underlying `execAsync` can return before the process exits; this function passes RUNNING status to callers. `startCommandInConnector` or `launchCommandInConnector` would be accurate.

**N6 — `tryExtractCommandOutputFromConnector` — "try" implies non-throwing; "extract" implies terminal result**
File: [execute_in_connector.ts:99](src/platform/plugins/shared/workflows_extensions/server/steps/remote_host/execute_in_connector.ts#L99)
The function can throw and may return RUNNING status. `pollCommandStatusFromConnector` would be accurate.
