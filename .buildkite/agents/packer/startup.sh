#!/usr/bin/env bash

set -euxo pipefail

export DEBIAN_FRONTEND="noninteractive"

sudo -u buildkite-agent gcloud auth configure-docker --quiet

agentConfig="$(curl http://metadata.google.internal/computeMetadata/v1/instance/attributes/buildkite-agent-config -qf -H "Metadata-Flavor: Google" || true)"

echo "${agentConfig}" >> /etc/buildkite-agent/buildkite-agent.cfg
systemctl enable buildkite-agent
systemctl start buildkite-agent

exit 0