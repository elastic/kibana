## 1. Implementation (proposal deliverables)
- [ ] 1.1 Create OpenSpec change folder `openspec/changes/add-vllm-gcp-vm-manager-agent/`
- [ ] 1.2 Draft `proposal.md` with scope, safety posture, and impact
- [ ] 1.3 Draft `design.md` covering SSH-only operations, vLLM container management, benchmark methodology, and tool-calling conformance gating
- [ ] 1.4 Draft spec delta `specs/vllm-vm-management-agent/spec.md` with requirements + scenarios
- [ ] 1.5 Validate OpenSpec output with `openspec validate add-vllm-gcp-vm-manager-agent --strict`

## 2. Follow-up implementation (phased, for subsequent PRs)

### 2.1 VM/container management
- [ ] 2.1.1 Implement SSH connectivity + remote command execution with allow-listed operations and redacted logs
- [ ] 2.1.2 Implement vLLM Docker lifecycle operations (start/stop/restart, image updates, config reload)
- [ ] 2.1.3 Implement health checks (HTTP `/health`, `/v1/models`) and structured diagnostics (GPU, VRAM, clocks, driver/CUDA)

### 2.2 Benchmarking + tuning
- [ ] 2.2.1 Implement a benchmark runner that executes vLLM benchmark suites (throughput + serving) with reproducible configs
- [ ] 2.2.2 Implement automatic config search (bounded grid search) for key vLLM knobs: tensor parallelism, max model len, GPU memory utilization, KV cache dtype, quantization mode (when applicable)
- [ ] 2.2.3 Persist benchmark artifacts (inputs, configs, metrics, versions) and produce a recommended “best config” per model + hardware profile

### 2.3 Model research + recommendation
- [ ] 2.3.1 Implement model discovery (HuggingFace metadata ingestion) + candidate filtering (license, size, context length, chat/instruct)
- [ ] 2.3.2 Implement scoring/ranking (tool-calling pass/fail gate, throughput, p95 latency, cost proxy, quality proxy where feasible)
- [ ] 2.3.3 Publish recommended models list for the hardware profile (2x A100 80GB) with rationale and configs

### 2.4 Tool-calling conformance
- [ ] 2.4.1 Build a conformance suite that checks schema-valid JSON tool calls against representative Agent Builder tool schemas
- [ ] 2.4.2 Add guided decoding / JSON enforcement compatibility options (backend selection) as part of config tuning
- [ ] 2.4.3 Add regression checks so recommendations do not drift without re-validation


