#!/bin/bash
set -euo pipefail

# Increment this number to cause everyone's docs project to be reset on their next run
# This is so that we can somewhat automatically fix people's projects when the upstream docs project has a breaking change that requires resetting the project
RESET_VERSION=1

KIBANA_DIR=$(cd "$(dirname "$0")"/.. && pwd)
WORKSPACE=$(cd "$KIBANA_DIR/.." && pwd)/kibana-docs
export NVM_DIR="$WORKSPACE/.nvm"

DOCS_DIR="$WORKSPACE/repos/elastic/docs.elastic.dev"

cd "$KIBANA_DIR"

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"
touch "$WORKSPACE/.version"

if [[ ! -d "$NVM_DIR" ]]; then
  echo "Installing a separate copy of nvm"
  git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR"
  cd "$NVM_DIR"
  git checkout "$(git describe --abbrev=0 --tags --match "v[0-9]*" "$(git rev-list --tags --max-count=1)")"
  cd "$WORKSPACE"
fi
source "$NVM_DIR/nvm.sh"

function clone {
  dir="${WORKSPACE}/repos/elastic/${1}"
  if [ ! -d "$dir" ]; then
    echo "cloning elastic/${1}"
    git clone "git@github.com:elastic/${1}.git" "$dir" 1> /dev/null 2>&1
  else
    cd "$dir"
    echo "updating elastic/${1}"
    git pull 1> /dev/null 2>&1
    cd "$WORKSPACE"
  fi
}

clone "ci" &
clone "dev" &
clone "docs.elastic.dev" &
clone "docs-eng-team" &
clone "docsmobile" &
clone "kibana-team" &
clone "platform-engineering-productivity" &
clone "tech-writing-guidelines" &
clone "platform-docs-team" &
clone "release-eng" &
wait

# The minimum sources required to build kibana docs
cat << EOF > "$DOCS_DIR/config/content.js"
module.exports = {
  "content": {
    "sources": [
      {
        "type": "file",
        "location": "$KIBANA_DIR"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/dev"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/kibana-team"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/ci"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/docsmobile/doc-site"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/docs-eng-team"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/platform-engineering-productivity"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/tech-writing-guidelines"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/platform-docs-team"
      },
      {
        "type": "file",
        "location": "${WORKSPACE}/repos/elastic/release-eng"
      },
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
