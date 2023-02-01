#!/bin/bash
set -euo pipefail

# Increment this number to cause everyone's docs project to be reset on their next run
# This is so that we can somewhat automatically fix people's projects when the upstream docs project has a breaking change that requires resetting the project
RESET_VERSION=1

KIBANA_DIR=$(cd "$(dirname "$0")"/.. && pwd)
WORKSPACE=$(cd "$KIBANA_DIR/.." && pwd)/kibana-docs
export NVM_DIR="$WORKSPACE/.nvm"

DOCS_DIR="$WORKSPACE/docs.elastic.dev"

# These are the other repos with docs currently required to build the docs in this repo and not get errors
# For example, kibana docs link to docs in these repos, and if they aren't built, you'll get errors
DEV_DIR="$WORKSPACE/dev"
TEAM_DIR="$WORKSPACE/kibana-team"

cd "$KIBANA_DIR"
origin=$(git remote get-url origin || true)
GIT_PREFIX="git@github.com:"
if [[ "$origin" == "https"* ]]; then
  GIT_PREFIX="https://github.com/"
fi

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"
touch "$WORKSPACE/.version"
RESET_VERSION_FROM_FILE=$(cat "$WORKSPACE/.version")

if [[ ! -d "$NVM_DIR" ]]; then
  echo "Installing a separate copy of nvm"
  git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR"
  cd "$NVM_DIR"
  git checkout "$(git describe --abbrev=0 --tags --match "v[0-9]*" "$(git rev-list --tags --max-count=1)")"
  cd "$WORKSPACE"
fi
source "$NVM_DIR/nvm.sh"

if [[ ! -d "$DOCS_DIR" ]]; then
  echo "Cloning docs.elastic.dev repo..."
  git clone --depth 1 "${GIT_PREFIX}elastic/docs.elastic.dev.git"
else
  cd "$DOCS_DIR"
  git pull
  if [[ "$RESET_VERSION" != "$RESET_VERSION_FROM_FILE" ]]; then
    echo "Resetting docs.elastic.dev repo..."
    git clean -fdxq
  fi
  cd "$WORKSPACE"
fi

if [[ ! -d "$DEV_DIR" ]]; then
  echo "Cloning dev repo..."
  git clone --depth 1 "${GIT_PREFIX}elastic/dev.git"
else
  cd "$DEV_DIR"
  git pull
  cd "$WORKSPACE"
fi

if [[ ! -d "$TEAM_DIR" ]]; then
  echo "Cloning kibana-team repo..."
  git clone --depth 1 "${GIT_PREFIX}elastic/kibana-team.git"
else
  cd "$TEAM_DIR"
  git pull
  cd "$WORKSPACE"
fi

# The minimum sources required to build kibana docs
cat << EOF > "$DOCS_DIR/config/content-dev.js"
module.exports = {
  "content": {
    "sources": [
      {
        "type": "file",
        "location": "$KIBANA_DIR"
      },
      {
        "type": "file",
        "location": "$DEV_DIR"
      },
      {
        "type": "file",
        "location": "$TEAM_DIR"
      }
    ],
    "nav": {
      "structure": [
        "nav-elastic-developer-guide",
        "nav-kibana-team",
        "nav-kibana-dev"
      ],
      "default": "nav-kibana-dev"
    }
  }
};
EOF

cd "$DOCS_DIR"
nvm install

if ! which yarn; then
  npm install -g yarn
fi

yarn

if [[ ! -d .docsmobile ]]; then
  yarn init-docs
fi

echo ""
echo "The docs.elastic.dev project is located at:"
echo "$DOCS_DIR"
echo ""

echo $RESET_VERSION > "$WORKSPACE/.version"

if [[ "${1:-}" ]]; then
  yarn "$@"
else
  yarn dev
fi
