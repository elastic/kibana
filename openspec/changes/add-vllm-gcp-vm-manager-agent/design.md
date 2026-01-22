# Design: vLLM GCP VM Manager Agent

## Context
We want a Cursor Agent that can manage a remote GCP VM running vLLM in Docker, tune vLLM configuration for the VM's GPU hardware (initially 2x A100 80GB), and continuously recommend open-source HuggingFace models/configs that work well with Kibana's Agent Builder tool-calling.

Operational constraints:
- Operator has SSH access to the VM.
- vLLM runs inside Docker on the VM.
- Benchmarks should be reproducible, attributable (versioned), and comparable across runs.
- Recommendations must be gated by tool-calling reliability, not just throughput/latency.

## Goals / Non-Goals

### Goals
- Provide safe, repeatable remote operations via SSH for managing the vLLM Docker container (start/stop/restart/status/logs).
- Support end-to-end model deployment: given SSH credentials and a model identifier, deploy and verify the model is running properly.
- Automatically manage disk space by removing old HuggingFace models when space is insufficient.
- Produce "best config" recommendations per model for the current hardware profile using vLLM benchmarks.
- Maintain a recommended model list for the VM hardware that is explicitly validated for Agent Builder tool calling.
- Record artifacts (configs, metrics, tool-calling pass/fail evidence, versions) to support auditing and regression tracking.

### Non-Goals
- Fully autonomous infrastructure changes without operator oversight (e.g., arbitrary remote shell, destructive actions without confirmation).
- A general-purpose MLOps platform (training, fine-tuning, dataset curation).
- Claiming "best model quality" in a general sense; the first iteration optimizes for tool-calling reliability + performance, with quality evaluation remaining optional/limited.

## Decisions

### Decision: SSH-first management, with allow-listed remote operations
**What**: The agent operates over SSH and runs a limited set of allow-listed commands for:
- Docker container lifecycle
- vLLM endpoint health checks
- GPU/environment inspection (e.g., `nvidia-smi`)
- Disk space management and model cleanup
- Model download and verification

**Why**: SSH access exists today and minimizes required cloud IAM setup. Allow-listing reduces the risk of accidental/unsafe remote execution.

**Alternatives considered**:
- **GCP API / gcloud-based VM lifecycle management**: Useful but requires credential management and broader permissions; defer to a follow-up phase.

### Decision: Support both password and key-based SSH authentication
**What**: The agent supports both SSH password authentication and SSH key-based authentication for maximum flexibility.

**Why**: Different environments may use different authentication methods. Password support enables quick setup without key management overhead.

**Alternatives considered**:
- **Key-only authentication**: Too restrictive for environments where password auth is standard or keys are not readily available.

### Decision: Recommendations require passing a tool-calling conformance gate
**What**: A model is not "recommended" unless it passes a conformance suite that validates schema-correct tool calls for representative Agent Builder tool schemas and prompts.

**Why**: For Agent Builder, a faster model that frequently emits malformed tool calls is worse than a slower model that is dependable.

**Alternatives considered**:
- **Throughput-only optimization**: Rejected; tool-call reliability is a first-order constraint.

### Decision: Benchmarking uses vLLM benchmark tooling + a bounded config search
**What**: Use vLLM benchmark capabilities (throughput + serving) as the measurement foundation, and run a bounded grid search over key knobs (e.g., tensor parallelism, max model len, GPU memory utilization, KV cache dtype, quantization mode when applicable).

**Why**: vLLM's benchmarking utilities provide a standard baseline; adding a bounded search gives practical "best config" recommendations for the exact hardware without building a bespoke harness first.

### Decision: Tool-calling reliability may use guided decoding / JSON enforcement when available
**What**: The agent MAY recommend enabling guided decoding / structured output enforcement (where supported by vLLM runtime configuration) when it materially improves tool-call conformance without unacceptable performance regressions.

**Why**: Many OSS models vary in structured output reliability; guided decoding can improve correctness for tool call payloads.

## Risks / Trade-offs
- **Risk: Secrets leakage in logs or saved artifacts** → Mitigation: never log private keys or passwords; redact hostnames/usernames by default; avoid storing raw prompts/responses unless explicitly enabled.
- **Risk: Unsafe remote execution** → Mitigation: allow-listed operations; explicit confirmation for destructive actions; structured command templates (no free-form shell by default).
- **Risk: Accidental model deletion** → Mitigation: only remove models when explicitly needed for space; log all removals with timestamps and reasons; prioritize oldest models based on last access time.
- **Risk: Benchmark non-representativeness** → Mitigation: maintain a "Agent Builder-like" workload profile (tool-call-heavy short turns + a few long turns) and keep it versioned.
- **Risk: Chasing new models causes churn** → Mitigation: stable recommendation windows and regression gates; tag recommendations with "validated on date/version."

## Migration Plan

### Phase 1: Proposal + foundations
- Define the capability requirements and conformance gates.
- Establish benchmark methodology and artifact schema.

### Phase 2: Management + diagnostics
- Implement SSH connectivity and vLLM container management.
- Add health checks and environment inventory.

### Phase 3: Benchmarking + recommendations
- Implement vLLM benchmark execution and bounded config search.
- Persist results and publish ranked recommendations per hardware profile.

## Open Questions
- How should the agent store remote target configuration (host, user, password/key path) in a way that aligns with your local Cursor setup?
- Which Agent Builder tool schemas should form the canonical conformance suite (minimal "hello tools" vs a richer set)?
- Do we want to enforce a specific API surface (OpenAI-compatible `/v1/chat/completions`) for Agent Builder integration, or support multiple?
- Should the initial model discovery be "manual curation + benchmark" or fully automated from HuggingFace metadata?
- What threshold should trigger automatic model cleanup (e.g., <10% free space, <50GB free)?
