#!/bin/bash

ENV_PATH=".devcontainer/.env"
KBN_CONFIG_FILE="config/kibana.dev.yml"

setup_fips() {
  if [ ! -f "$KBN_CONFIG_FILE" ]; then
    touch $KBN_CONFIG_FILE
  fi

  if [ -n "$FIPS" ] && [ "$FIPS" == "1" ]; then
    echo "FIPS mode enabled"
    yq ".xpack.security.experimental.fipsMode.enabled = true" -i $KBN_CONFIG_FILE

    # Patch node_modules so we can start Kibana in dev mode
    sed -i 's/hashType = hashType || '\''md5'\'';/hashType = hashType || '\''sha1'\'';/g' node_modules/file-loader/node_modules/loader-utils/lib/getHashDigest.js
    sed -i 's/const hash = createHash("md4");/const hash = createHash("sha1");/g' node_modules/webpack/lib/ModuleFilenameHelpers.js
    sed -i 's/contentHash: createHash("md4")/contentHash: createHash("sha1")/g' node_modules/webpack/lib/SourceMapDevToolPlugin.js

    export OPENSSL_MODULES="$OPENSSL_PATH/lib/ossl-modules"
    export NODE_OPTIONS="--enable-fips --openssl-config=$KBN_DIR/.devcontainer/config/nodejs.cnf"
  else
    echo "FIPS mode disabled"

    yq ".xpack.security.experimental.fipsMode.enabled = false" -i $KBN_CONFIG_FILE
  fi
}

setup_shell() {
  if [ -n "$SHELL" ] && [ -x "$SHELL" ]; then
    echo "Using shell: $SHELL"
    sudo chsh -s "$SHELL" vscode
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
