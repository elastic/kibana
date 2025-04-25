#!/bin/bash

ENV_PATH="${KBN_DIR}/.devcontainer/.env"
KBN_CONFIG_FILE="${KBN_DIR}/config/kibana.dev.yml"

setup_fips() {
  if [ ! -f "$KBN_CONFIG_FILE" ]; then
    touch "$KBN_CONFIG_FILE"
  fi

  if [ -n "$FIPS" ] && [ "$FIPS" = "1" ]; then
    sed -i '/xpack.security.fipsMode.enabled:/ {s/.*/xpack.security.fipsMode.enabled: true/; t}; $a\xpack.security.fipsMode.enabled: true' "$KBN_CONFIG_FILE"

    # Patch node_modules so we can start Kibana in dev mode
    sed -i 's/hashType = hashType || '\''md5'\'';/hashType = hashType || '\''sha1'\'';/g' "${KBN_DIR}/node_modules/file-loader/node_modules/loader-utils/lib/getHashDigest.js"
    sed -i 's/const hash = createHash("md4");/const hash = createHash("sha1");/g' "${KBN_DIR}/node_modules/webpack/lib/ModuleFilenameHelpers.js"
    sed -i 's/contentHash: createHash("md4")/contentHash: createHash("sha1")/g' "${KBN_DIR}/node_modules/webpack/lib/SourceMapDevToolPlugin.js"

    export OPENSSL_MODULES="$OPENSSL_PATH/lib/ossl-modules"
    export NODE_OPTIONS="--enable-fips --openssl-config=$KBN_DIR/.devcontainer/config/nodejs.cnf"
    echo "FIPS mode enabled"
    echo "If manually bootstrapping in FIPS mode use: NODE_OPTIONS='' yarn kbn bootstrap"
  else
    sed -i '/xpack.security.fipsMode.enabled:/ {s/.*/xpack.security.fipsMode.enabled: false/; t}; $a\xpack.security.fipsMode.enabled: false' "$KBN_CONFIG_FILE"
  fi
}

setup_shell() {
  if [ -n "$SHELL" ] && [ -x "$SHELL" ]; then
    current_shell=$(ps -p $$ -o comm=)
    desired_shell=$(basename "$SHELL")

    if [ "$current_shell" != "$desired_shell" ]; then
      sudo chsh -s "$SHELL" vscode
      exec "$SHELL"
    fi
  else
    echo "Shell is not set or not executable, using bash"
  fi
}

if [ -f "$ENV_PATH" ]; then
  source "$ENV_PATH"
  setup_fips
  setup_shell
else
  echo ".env file not found, using default values"
fi
