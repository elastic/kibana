#!/bin/bash
# Elastic Observability Onboarding — Claude Code skill installer
# Downloads the skill from a Kibana instance and installs it locally.

set -euo pipefail

KIBANA_URL=""
SKILL_DIR="${HOME}/.claude/skills/observability-onboarding"

usage() {
  echo "Usage: $0 --kibana-url=<url>"
  echo ""
  echo "Downloads and installs the Elastic Observability onboarding skill for Claude Code."
  echo ""
  echo "Options:"
  echo "  --kibana-url=URL   Base URL of your Kibana instance (required)"
  exit 1
}

for arg in "$@"; do
  case $arg in
    --kibana-url=*)
      KIBANA_URL="${arg#*=}"
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      echo "Unknown option: $arg"
      usage
      ;;
  esac
done

if [ -z "$KIBANA_URL" ]; then
  echo "Error: --kibana-url is required"
  usage
fi

# Strip trailing slash
KIBANA_URL="${KIBANA_URL%/}"

echo "Installing Elastic Observability onboarding skill for Claude Code..."
echo "  Source: ${KIBANA_URL}"
echo "  Target: ${SKILL_DIR}"
echo ""

mkdir -p "${SKILL_DIR}"

SKILL_ASSET_BASE="${KIBANA_URL}/plugins/observabilityOnboarding/assets/agent_skill"

echo "Downloading skill..."
curl -fsSL "${SKILL_ASSET_BASE}/SKILL.md" -o "${SKILL_DIR}/SKILL.md"

echo ""
echo "Skill installed to ${SKILL_DIR}/SKILL.md"
echo ""
echo "You can now use it with Claude Code:"
echo ""
echo "  claude \"help me onboard elastic\""
echo ""
