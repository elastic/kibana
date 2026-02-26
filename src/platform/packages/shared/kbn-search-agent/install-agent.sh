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
echo "Done. Agent configuration installed."
