# Specification: vLLM VM Management Agent

## ADDED Requirements

### Requirement: Remote target configuration (SSH)
The system MUST support configuring a remote vLLM target using SSH access (host, user, and authentication material) without committing secrets into the repository. The system MUST support both SSH key-based and password-based authentication.

#### Scenario: SSH target configured without storing secrets in repo
- **GIVEN** a user provides SSH connection parameters (host, username, and either password or key path)
- **WHEN** the agent stores and uses the configuration
- **THEN** private keys, passwords, and other secrets are not written into the repo workspace
- **AND** logs redact sensitive fields by default

#### Scenario: SSH connection with password authentication
- **GIVEN** a user provides SSH host, username, and password
- **WHEN** the agent connects to the remote VM
- **THEN** the connection succeeds using password authentication
- **AND** the password is not stored in plain text or committed to the repository

#### Scenario: SSH connection with key-based authentication
- **GIVEN** a user provides SSH host, username, and private key path
- **WHEN** the agent connects to the remote VM
- **THEN** the connection succeeds using key-based authentication
- **AND** the private key content is not stored in plain text or committed to the repository

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

#### Scenario: Stop vLLM requires confirmation
- **GIVEN** a running vLLM service
- **WHEN** the agent is instructed to stop the service without confirmation
- **THEN** the agent refuses and requests explicit confirmation

#### Scenario: Get container status
- **GIVEN** a vLLM Docker container on the remote VM
- **WHEN** the agent requests container status
- **THEN** the agent returns the container state (running, stopped, restarting, etc.)
- **AND** the agent returns container health information if available

#### Scenario: Retrieve container logs
- **GIVEN** a vLLM Docker container on the remote VM
- **WHEN** the agent requests container logs
- **THEN** the agent returns recent log output from the container
- **AND** logs are redacted for sensitive information by default

### Requirement: Service health and readiness checks
The system MUST check vLLM readiness and health using API-level probes before declaring the service "ready".

#### Scenario: Service becomes ready after (re)start
- **GIVEN** the vLLM container has been started
- **WHEN** the agent checks readiness
- **THEN** the agent verifies the health endpoint is successful
- **AND** the agent verifies the model list endpoint responds successfully

#### Scenario: Health check detects service failure
- **GIVEN** the vLLM container is running but the service is not responding
- **WHEN** the agent performs a health check
- **THEN** the agent reports the service as unhealthy
- **AND** the agent provides diagnostic information (container status, recent logs, error messages)

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
- **AND** the report includes CUDA and driver versions
- **AND** the report includes vLLM version and container image information

### Requirement: Benchmark execution using vLLM benchmark tooling
The system MUST support running vLLM benchmark workloads against candidate models and capturing performance metrics suitable for ranking and regression detection.

#### Scenario: Throughput benchmark produces reproducible metrics
- **GIVEN** a pinned model revision and a pinned benchmark workload profile
- **WHEN** the benchmark is executed
- **THEN** the agent records throughput and latency metrics along with the exact config and versions used
- **AND** metrics are stored with version information for reproducibility

#### Scenario: Benchmark captures config parameters
- **GIVEN** a benchmark execution with specific vLLM configuration
- **WHEN** the benchmark completes
- **THEN** the agent records all relevant configuration parameters (tensor parallelism, max model len, KV cache settings, etc.)
- **AND** the recorded configuration can be used to reproduce the benchmark

### Requirement: Recommended configuration search for target hardware
The system MUST support a bounded, reproducible configuration search to determine the recommended vLLM runtime configuration per model and hardware profile.

#### Scenario: Best config is selected for a candidate model
- **GIVEN** a candidate model and the hardware profile (2x A100 80GB)
- **WHEN** the agent runs a bounded config search
- **THEN** the agent selects a recommended config based on tool-calling conformance and performance metrics
- **AND** the agent records the decision rationale and measured trade-offs

#### Scenario: Config search explores key parameters
- **GIVEN** a candidate model and hardware profile
- **WHEN** the agent runs a config search
- **THEN** the agent explores variations in tensor parallelism, max model len, GPU memory utilization, KV cache dtype, and quantization mode (when applicable)
- **AND** the search space is bounded to prevent excessive runtime

### Requirement: Tool-calling conformance gate for Agent Builder
The system MUST validate that recommended models can reliably produce schema-valid tool calls for a representative Agent Builder tool schema set.

#### Scenario: Model is rejected if tool calls are malformed
- **GIVEN** a model that produces invalid JSON or schema-invalid tool calls
- **WHEN** the conformance suite is run
- **THEN** the model is not recommended regardless of raw throughput/latency
- **AND** the agent records the specific conformance failures

#### Scenario: Model passes conformance gate
- **GIVEN** a model that produces valid, schema-compliant tool calls
- **WHEN** the conformance suite is run
- **THEN** the model passes the conformance gate
- **AND** the agent records evidence of successful tool calls for representative schemas

#### Scenario: Guided decoding improves conformance
- **GIVEN** a model that has marginal tool-calling reliability
- **WHEN** the agent tests with guided decoding / JSON enforcement enabled
- **THEN** if conformance improves materially without unacceptable performance regression, the agent recommends enabling guided decoding
- **AND** the agent records the performance impact of guided decoding

### Requirement: Recommended model list for the target hardware profile
The system MUST produce a ranked list of recommended HuggingFace OSS models for the current hardware profile, including the recommended vLLM config for each model.

#### Scenario: Recommendations include config and evidence
- **GIVEN** benchmarks and conformance results for multiple candidate models
- **WHEN** the agent publishes recommendations
- **THEN** each recommendation includes model id/revision, serving config, and benchmark/conformance summary
- **AND** recommendations are ranked by a composite score (tool-calling reliability, throughput, latency)

#### Scenario: Recommendations are versioned and attributable
- **GIVEN** a published recommendation list
- **WHEN** the agent provides a recommendation
- **THEN** the recommendation includes validation date, vLLM version, benchmark version, and hardware profile
- **AND** the recommendation can be traced back to specific benchmark runs and conformance test results

### Requirement: Safety gates for destructive or high-impact operations
The system MUST require explicit confirmation for destructive or high-impact operations (e.g., stopping service, changing model/config, updating images).

#### Scenario: Stop operation requires confirmation
- **GIVEN** a running vLLM service
- **WHEN** the agent is instructed to stop the service without confirmation
- **THEN** the agent refuses and requests explicit confirmation

#### Scenario: Model deletion requires confirmation
- **GIVEN** a request to delete a model from the remote VM
- **WHEN** the agent is instructed to delete without confirmation
- **THEN** the agent refuses and requests explicit confirmation

#### Scenario: Config change requires confirmation
- **GIVEN** a request to change vLLM runtime configuration
- **WHEN** the agent is instructed to apply the change without confirmation
- **THEN** the agent refuses and requests explicit confirmation for high-impact changes

### Requirement: End-to-end model deployment
The system MUST support deploying a specified HuggingFace model to the remote VM and ensuring it is running properly. Given SSH credentials (host, username, password or key) and a model identifier, the system MUST handle the complete deployment workflow from connection to verified running service.

#### Scenario: Deploy model from scratch
- **GIVEN** SSH host, username, password, and a HuggingFace model identifier
- **WHEN** the user requests model deployment
- **THEN** the agent connects to the VM via SSH
- **AND** the agent downloads/verifies the model if not present
- **AND** the agent configures vLLM with appropriate settings for the hardware
- **AND** the agent starts the vLLM container with the specified model
- **AND** the agent verifies the model is running and responding to health checks
- **AND** the agent confirms the model is accessible via the vLLM API endpoints

#### Scenario: Deploy model with existing model present
- **GIVEN** a VM with an existing model already deployed
- **WHEN** the user requests deployment of a different model
- **THEN** the agent stops the current vLLM container (with confirmation)
- **AND** the agent downloads the new model if not present
- **AND** the agent configures and starts vLLM with the new model
- **AND** the agent verifies the new model is running correctly

### Requirement: Automatic disk space management
The system MUST automatically manage disk space on the remote VM by removing old HuggingFace models when free space is insufficient for new model deployments or operations. The system MUST prioritize removing the oldest models first based on last access time or download timestamp.

#### Scenario: Remove oldest model when disk space is low
- **GIVEN** the VM has insufficient free space for a new model deployment
- **WHEN** the agent detects the space constraint
- **THEN** the agent identifies the oldest HuggingFace model on the host
- **AND** the agent removes the oldest model to free space
- **AND** the agent verifies sufficient space is now available
- **AND** the agent continues with the requested operation
- **AND** the agent logs which model was removed and why

#### Scenario: Multiple models removed if needed
- **GIVEN** the VM has insufficient free space and removing one model is not enough
- **WHEN** the agent detects the space constraint
- **THEN** the agent removes models in order from oldest to newest until sufficient space is available
- **AND** the agent logs which models were removed and why

#### Scenario: Disk space check before deployment
- **GIVEN** a request to deploy a new model
- **WHEN** the agent checks available disk space
- **THEN** if insufficient space exists, the agent triggers automatic cleanup before proceeding
- **AND** if cleanup is insufficient, the agent reports the space constraint and aborts deployment

#### Scenario: Disk space threshold triggers cleanup
- **GIVEN** a configurable disk space threshold (e.g., <10% free or <50GB free)
- **WHEN** the agent detects disk space below the threshold
- **THEN** the agent automatically identifies and removes the oldest models until space is above the threshold
- **AND** the agent logs all cleanup actions with timestamps and reasons
