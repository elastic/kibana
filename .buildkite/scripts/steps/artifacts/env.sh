#!/usr/bin/env bash

set -euo pipefail

BASE_VERSION="$(jq -r '.version' package.json)"
VERSION_QUALIFIER="${VERSION_QUALIFIER:=}"

if [[ "$VERSION_QUALIFIER" == "" ]]; then
  QUALIFIER_VERSION="$BASE_VERSION"
else
  QUALIFIER_VERSION="$BASE_VERSION-$VERSION_QUALIFIER"
fi

if [[ "${RELEASE_BUILD:-}" == "true" ]]; then
  FULL_VERSION="$QUALIFIER_VERSION"

  # Beats artifacts will need to match a specific commit sha that matches other stack images
  # for release builds.  For now we are skipping Cloud builds until there's a pointer.
  BUILD_ARGS="--release --skip-docker-cloud --version-qualifier=$VERSION_QUALIFIER"
  WORKFLOW="staging"
else
  FULL_VERSION="$QUALIFIER_VERSION-SNAPSHOT"
  BUILD_ARGS="--version-qualifier=$VERSION_QUALIFIER"
  WORKFLOW="snapshot"
fi

export VERSION_QUALIFIER
export BASE_VERSION
export QUALIFIER_VERSION
export FULL_VERSION
export BUILD_ARGS
export WORKFLOW
