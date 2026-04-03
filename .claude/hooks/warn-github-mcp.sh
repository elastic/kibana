#!/bin/bash
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/kibana-claude"
MARKER="$STATE_DIR/github-mcp-warned"

if [ -f "$MARKER" ]; then
  exit 0
fi

USER_MSG="WARNING: A GitHub MCP server is active, which adds ~50k tokens of overhead per session. The Kibana repo already provides a gh-based GitHub skill that covers the same functionality and is well-supported by all major models. Consider removing the MCP server to save context budget."

mkdir -p "$STATE_DIR"
echo >"$MARKER"

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "$USER_MSG"
  }
}
EOF
