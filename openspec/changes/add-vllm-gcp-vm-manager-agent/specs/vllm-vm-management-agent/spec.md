## ADDED Requirements

### Requirement: Remote target configuration (SSH)
The system MUST support configuring a remote vLLM target using SSH access (host, user, and authentication material) without committing secrets into the repository.

#### Scenario: SSH target configured without storing secrets in repo
- **GIVEN** a user provides SSH connection parameters
- **WHEN** the agent stores and uses the configuration
- **THEN** private keys and other secrets are not written into the repo workspace
- **AND** logs redact sensitive fields by default

### Requirement: vLLM Docker container lifecycle management
The system MUST provide allow-listed operations over SSH to manage the vLLM Docker container lifecycle:
- start
- stop
- restart
- status
- logs

#### Scenario: Restart vLLM safely
- **GIVEN** vLLM is running in a Docker container on the remote VM
- **WHEN** the user requests a restart
- **THEN** the agent restarts the container and verifies the service returns healthy

### Requirement: Service health and readiness checks
The system MUST check vLLM readiness and health using API-level probes before declaring the service “ready”.

#### Scenario: Service becomes ready after (re)start
- **GIVEN** the vLLM container has been started
- **WHEN** the agent checks readiness
- **THEN** the agent verifies the health endpoint is successful
- **AND** the agent verifies the model list endpoint responds successfully

### Requirement: Hardware and runtime inventory
The system MUST capture and report the VM hardware/runtime inventory relevant to performance tuning:
- GPU model/count and VRAM
- driver/CUDA versions
- container image/version
- vLLM version and key runtime flags

#### Scenario: Inventory is captured for an A100 2x80GB target
- **GIVEN** the agent connects to a VM with 2x A100 80GB GPUs
- **WHEN** the agent collects inventory
- **THEN** the report includes GPU count, GPU model, and total VRAM per GPU

### Requirement: Benchmark execution using vLLM benchmark tooling
The system MUST support running vLLM benchmark workloads against candidate models and capturing performance metrics suitable for ranking and regression detection.

#### Scenario: Throughput benchmark produces reproducible metrics
- **GIVEN** a pinned model revision and a pinned benchmark workload profile
- **WHEN** the benchmark is executed
- **THEN** the agent records throughput and latency metrics along with the exact config and versions used

### Requirement: Recommended configuration search for target hardware
The system MUST support a bounded, reproducible configuration search to determine the recommended vLLM runtime configuration per model and hardware profile.

#### Scenario: Best config is selected for a candidate model
- **GIVEN** a candidate model and the hardware profile (2x A100 80GB)
- **WHEN** the agent runs a bounded config search
- **THEN** the agent selects a recommended config based on tool-calling conformance and performance metrics
- **AND** the agent records the decision rationale and measured trade-offs

### Requirement: Tool-calling conformance gate for Agent Builder
The system MUST validate that recommended models can reliably produce schema-valid tool calls for a representative Agent Builder tool schema set.

#### Scenario: Model is rejected if tool calls are malformed
- **GIVEN** a model that produces invalid JSON or schema-invalid tool calls
- **WHEN** the conformance suite is run
- **THEN** the model is not recommended regardless of raw throughput/latency

### Requirement: Recommended model list for the target hardware profile
The system MUST produce a ranked list of recommended HuggingFace OSS models for the current hardware profile, including the recommended vLLM config for each model.

#### Scenario: Recommendations include config and evidence
- **GIVEN** benchmarks and conformance results for multiple candidate models
- **WHEN** the agent publishes recommendations
- **THEN** each recommendation includes model id/revision, serving config, and benchmark/conformance summary

### Requirement: Safety gates for destructive or high-impact operations
The system MUST require explicit confirmation for destructive or high-impact operations (e.g., stopping service, changing model/config, updating images).

#### Scenario: Stop operation requires confirmation
- **GIVEN** a running vLLM service
- **WHEN** the agent is instructed to stop the service without confirmation
- **THEN** the agent refuses and requests explicit confirmation


