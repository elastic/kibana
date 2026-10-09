#!/usr/bin/env bash
#
# Triggers the docs-release-notes pipeline for a production promotion, but only when the
# quality-gate steps it depends on passed.
#
# `depends_on` alone is not enough. Buildkite also runs a dependent step after a soft failure,
# and the quality-gate steps are soft_fail. This script reads the outcome of each step and
# uploads the trigger step only when every one of them is "passed".
#
# Usage: notify_docs_release_notes.sh <service> <step key>...
#   service    kibana or elasticsearch
#   step key   key of a quality-gate step that the promotion depends on
#
# Environment, set by the promotion build: SERVICE_VERSION, ENVIRONMENT, DEPLOYMENT_SLICES.

set -euo pipefail

service="${1:-}"
shift || true

if [[ "${service}" != "kibana" && "${service}" != "elasticsearch" ]]; then
  echo "The service must be kibana or elasticsearch, got '${service}'" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Pass the key of at least one quality-gate step" >&2
  exit 1
fi

# These values go into the YAML that is uploaded below, so check their shape first.
version="${SERVICE_VERSION:-}"
version="${version:0:12}"
if [[ ! "${version}" =~ ^[0-9a-fA-F]{12}$ ]]; then
  echo "SERVICE_VERSION must start with 12 hex characters, got '${SERVICE_VERSION:-}'" >&2
  exit 1
fi

environment="${ENVIRONMENT:-}"
if [[ ! "${environment}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "ENVIRONMENT must be a single word, got '${environment}'" >&2
  exit 1
fi

slices="${DEPLOYMENT_SLICES:-}"
if [[ ! "${slices}" =~ ^[A-Za-z0-9_,\ -]*$ ]]; then
  echo "DEPLOYMENT_SLICES holds unexpected characters, got '${slices}'" >&2
  exit 1
fi

# An unknown key makes this command fail, so a wrong key shows up as a failed step.
not_passed=()
for key in "$@"; do
  outcome="$(buildkite-agent step get outcome --step "${key}")"
  echo "Quality-gate step '${key}': ${outcome:-unknown}"
  if [[ "${outcome}" != "passed" ]]; then
    not_passed+=("${key} (${outcome:-unknown})")
  fi
done

if [[ ${#not_passed[@]} -gt 0 ]]; then
  summary="$(printf '%s, ' "${not_passed[@]}")"
  summary="${summary%, }"
  echo "Not triggering the release notes for ${service} ${version}: ${summary}"
  buildkite-agent annotate --style warning --context docs-release-notes \
    "Release notes were **not** triggered for ${service} \`${version}\`. These quality-gate steps did not pass: ${summary}. If the promotion is good, run the \`Changelog promotion bundle\` workflow in \`elastic/docs-internal-workflows\` with \`service=${service}\` and \`service-version=${version}\`. A later promotion starts its release notes from this version, so skipping it loses these changes."
  exit 0
fi

echo "--- Triggering docs-release-notes for ${service} ${version}"
buildkite-agent pipeline upload <<YAML
steps:
  - label: ":memo: Trigger docs-release-notes (${service} ${version})"
    trigger: docs-release-notes # https://buildkite.com/elastic/docs-release-notes
    async: true
    soft_fail: true
    build:
      message: "Release notes for ${service} ${version}"
      env:
        SERVICE: ${service}
        SERVICE_VERSION: ${version}
        ENVIRONMENT: ${environment}
        DEPLOYMENT_SLICES: "${slices}"
YAML
