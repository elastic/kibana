#!/bin/bash
set -e
echo "Installing Elasticsearch assistant for Cursor..."
echo "  - Downloading agent files from github.com/elastic/kibana"
curl -L -o elastic-agent.zip https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/elastic-agent.zip
echo "  - Extracting configuration files"
unzip -q elastic-agent.zip && rm elastic-agent.zip
rm -f AGENTS-elasticsearch-append.md
echo "  - Generating Cursor rule from AGENTS.md"
mkdir -p .cursor/rules
{ printf -- '---\ndescription: Elasticsearch solutions architect — guides developers from intent to working search\nglobs: \nalwaysApply: true\n---\n\n'; cat .elasticsearch-agent/AGENTS.md; } > .cursor/rules/elastic.mdc
echo "  - Installing skills into .cursor/skills/"
mkdir -p .cursor/skills
cp -r .elasticsearch-agent/skills/* .cursor/skills/ 2>/dev/null || true
echo "  - Cleaning up"
rm -rf .elasticsearch-agent
echo "Done. Cursor configuration installed."
echo ""
echo "Installed files:"
echo "  .cursor/rules/elastic.mdc              (Elasticsearch agent rule)"
echo "  .cursor/skills/recipes/                (use-case guides)"
