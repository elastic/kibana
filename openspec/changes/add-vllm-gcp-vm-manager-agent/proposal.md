# Change: Add Cursor Agent for managing a GCP vLLM VM and recommending OSS models/configs

## Why
Running open-source HuggingFace models via vLLM on a dedicated GPU VM requires careful configuration (GPU parallelism, KV cache, context limits, quantization, etc.) and frequent model re-evaluation as new models ship. A dedicated Cursor Agent can make this repeatable: manage the VM/container lifecycle, benchmark candidates, and recommend the best-performing models/configs that remain reliable for Agent Builder tool-calling.

## What Changes
- **ADDED**: A Cursor Agent responsible for managing a remote GCP VM that runs vLLM inside Docker (start/stop/restart, health checks, logs, config updates)
- **ADDED**: End-to-end model deployment workflow: given SSH credentials (host, username, password or key) and a model identifier, deploy and verify the model is running properly
- **ADDED**: Automatic disk space management that removes old HuggingFace models when VM runs out of free space, prioritizing oldest models first
- **ADDED**: Support for both SSH password and key-based authentication
- **ADDED**: Automated benchmarking workflows that use vLLM benchmark capabilities to determine recommended runtime configuration for a given VM hardware profile (initial target: 2x A100 80GB)
- **ADDED**: A model research + recommendation pipeline that tracks recent HuggingFace OSS model releases, filters to compatible candidates, benchmarks them, and publishes a ranked list for the current hardware
- **ADDED**: A tool-calling compatibility gate (Agent Builder-oriented) to ensure recommended models reliably produce schema-valid tool calls
- **ADDED**: Safety + governance controls for remote operations (explicit confirmations for destructive actions, secrets handling, audit logs)

## Impact
- **Affected specs**:
  - `vllm-vm-management-agent` - New capability for VM/container management, benchmarking, and recommendations
- **Affected code** (expected):
  - New agent implementation (Cursor agent scaffolding, command runner, SSH client, benchmark runner, results store)
  - New conformance tests for tool calling (Agent Builder tool schemas + prompts)


