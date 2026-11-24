---
description: >-
  Shared Agent Router setup for Claude workflows. Right before the agent starts,
  exchange the job's GitHub OIDC token for a Google ID token of the Kibana agentic
  workflows service account, and allow the gateway host through the firewall.
  Agent Router (https://llm.idea.elastichosting.ai) only issues tokens to
  *.lock.yml workflows on main. The token lasts about an hour and is not
  refreshed, so keep timeout-minutes under 60.

  Consumers also need:
    permissions       - id-token: write, and copilot-requests: write for threat detection
    engine.env        - ANTHROPIC_BASE_URL (the /anthropic path), ANTHROPIC_API_KEY
                        ("Bearer " + the agent-router-auth step's id_token output, with a
                        literal fallback for the activation job's key check),
                        AWF_ANTHROPIC_AUTH_HEADER: Authorization, and gateway model IDs
                        in ANTHROPIC_DEFAULT_*_MODEL
    threat-detection  - the copilot engine, with ANTHROPIC_API_KEY and
                        AWF_ANTHROPIC_AUTH_HEADER blanked: the detection job can't
                        request an OIDC token and inherits the main engine's env
pre-agent-steps:
  - name: Authenticate to Agent Router
    id: agent-router-auth
    uses: google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093 # v3.0.0
    with:
      workload_identity_provider: projects/117436331624/locations/global/workloadIdentityPools/kibana-agentic-ci-oidc/providers/kibana-agentic-ci-oidc
      service_account: gh-aw-kibana-ops-runner@elastic-edm.iam.gserviceaccount.com
      token_format: id_token
      # the gateway origin, with no path
      id_token_audience: https://llm.idea.elastichosting.ai
      id_token_include_email: true
      # only the id_token output is used; write no credentials file or env vars the agent could read
      create_credentials_file: false
      export_environment_variables: false
network:
  allowed:
    - llm.idea.elastichosting.ai
---
