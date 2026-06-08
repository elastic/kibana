#!/bin/bash

# Ona-specific post-start: runs the general devcontainer post-start,
# then applies Ona-only configuration.

# Run the shared devcontainer post-start script.
"${KBN_DIR}/.devcontainer/scripts/post_start.sh"

# Authenticate gh CLI and add the user's fork as a git remote using the
# platform-provided Git credential.
CRED=$(printf 'host=github.com\nprotocol=https\n' | git credential fill 2>/dev/null) || true
TOKEN=$(echo "$CRED" | awk -F= '/^password=/{print $2}')
if [ -n "$TOKEN" ]; then
  # Auth gh CLI so it can be used without a browser login flow.
  echo "$TOKEN" | gh auth login --hostname github.com --git-protocol https --with-token 2>/dev/null || true

  if ! git remote get-url fork >/dev/null 2>&1; then
    # Pass token via stdin to avoid exposing it in the process list
    GITHUB_USER=$(printf 'header = "Authorization: token %s"' "$TOKEN" | curl -sf --config - https://api.github.com/user | awk -F'"' '/"login"/{print $4}') || true
    if [ -n "$GITHUB_USER" ]; then
      git remote add fork "https://github.com/${GITHUB_USER}/kibana.git"
    fi
  fi
fi

# Configure Claude Code user settings for Ona environments:
# - theme: skip the first-run prompt
# - apiKeyHelper: fetch OIDC tokens for the Elastic access broker
mkdir -p "$HOME/.claude"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
DESIRED='{"theme":"auto","apiKeyHelper":"ona idp token --audience elastic-access-broker"}'
if [ -f "$CLAUDE_SETTINGS" ]; then
  # Merge desired keys into existing settings (existing user keys are preserved)
  echo "$DESIRED" | python3 -c "
import json, sys
desired = json.load(sys.stdin)
with open('$CLAUDE_SETTINGS') as f:
    current = json.load(f)
merged = {**current, **desired}
if merged != current:
    with open('$CLAUDE_SETTINGS', 'w') as f:
        json.dump(merged, f)
" 2>/dev/null || echo "$DESIRED" > "$CLAUDE_SETTINGS"
else
  echo "$DESIRED" > "$CLAUDE_SETTINGS"
fi
