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
    engine.model      - an exact gateway model ID, not an alias: gh-aw resolves an alias
                        to the newest model the gateway lists
    engine.env        - ANTHROPIC_BASE_URL (the /anthropic path), ANTHROPIC_API_KEY
                        (env.ANTHROPIC_API_KEY, which the steps below export, with a
                        literal fallback for the activation job's key check),
                        AWF_ANTHROPIC_AUTH_HEADER: Authorization, and gateway model IDs
                        in ANTHROPIC_DEFAULT_*_MODEL
    threat-detection  - the copilot engine, because the detection job can't request
                        an OIDC token, and continue-on-error: false
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
  # engine.env reads the key from env, not steps: gh-aw copies it into the activation job's key
  # check, where this step doesn't exist. gh-aw keeps ANTHROPIC_API_KEY out of the agent sandbox.
  - name: Export the Agent Router key
    env:
      ID_TOKEN: ${{ steps.agent-router-auth.outputs.id_token }}
    run: |
      if [[ ! "$ID_TOKEN" =~ ^[A-Za-z0-9._-]+$ ]]; then
        echo "::error::Agent Router returned no ID token, or an unexpected one" >&2
        exit 1
      fi
      printf 'ANTHROPIC_API_KEY=Bearer %s\n' "$ID_TOKEN" >> "$GITHUB_ENV"
network:
  allowed:
    - llm.idea.elastichosting.ai
---
