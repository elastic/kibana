#!/bin/bash
set -e
echo "Installing Elastic search agent configuration..."
echo "  - Downloading agent files from github.com/elastic/kibana"
curl -L -o elastic-agent.zip https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/elastic-agent.zip
echo "  - Extracting configuration files into current directory"
unzip -q elastic-agent.zip && rm elastic-agent.zip
echo "  - Appending Elasticsearch reference to AGENTS.md"
touch AGENTS.md
cat AGENTS-elasticsearch-append.md >> AGENTS.md
rm AGENTS-elasticsearch-append.md
if [ -d ".elasticsearch-agent-cursor" ]; then
  echo "  - Installing Cursor rules and skills into .cursor/"
  mkdir -p .cursor/rules .cursor/skills
  cp -r .elasticsearch-agent-cursor/rules/* .cursor/rules/ 2>/dev/null || true
  cp -r .elasticsearch-agent-cursor/skills/* .cursor/skills/ 2>/dev/null || true
  rm -rf .elasticsearch-agent-cursor
fi
echo "Done. Agent configuration installed."
