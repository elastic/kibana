#!/bin/bash

set -euo pipefail

CODEX_REAL_DIR="${HOME}/.local/share/codex/bin"
CODEX_REAL="${CODEX_REAL_DIR}/codex"
CODEX_WRAPPER="${HOME}/.local/bin/codex"
CODEX_PROFILE="${HOME}/.codex/ona-openrouter.config.toml"

mkdir -p "$CODEX_REAL_DIR" "$(dirname "$CODEX_WRAPPER")" "$(dirname "$CODEX_PROFILE")"

if [ ! -x "$CODEX_REAL" ]; then
  curl -fsSL https://chatgpt.com/codex/install.sh | \
    CODEX_NON_INTERACTIVE=1 CODEX_INSTALL_DIR="$CODEX_REAL_DIR" sh
fi

cat > "$CODEX_PROFILE" <<'TOML'
model = "openai/gpt-5.5"
model_provider = "kibana_openrouter"

[model_providers.kibana_openrouter]
name = "Kibana OpenRouter via access-broker"
base_url = "https://access-broker.kibana.dev/proxy/kibana.openrouter/v1"
wire_api = "responses"

[model_providers.kibana_openrouter.auth]
command = "ona"
args = ["idp", "token", "--audience", "elastic-access-broker"]
timeout_ms = 10000
refresh_interval_ms = 2700000
TOML

cat > "$CODEX_WRAPPER" <<EOF
#!/bin/bash
exec "$CODEX_REAL" --profile ona-openrouter "\$@"
EOF
chmod +x "$CODEX_WRAPPER"

PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'
for rc_file in "$HOME/.bashrc" "$HOME/.zshrc"; do
  touch "$rc_file"
  if ! grep -Fqx "$PATH_LINE" "$rc_file"; then
    echo "$PATH_LINE" >> "$rc_file"
  fi
done
