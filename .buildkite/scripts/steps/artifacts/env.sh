#!/usr/bin/env bash

set -euo pipefail

RELEASE_BUILD="${RELEASE_BUILD:="false"}"
VERSION_QUALIFIER="${VERSION_QUALIFIER:=""}"

BASE_VERSION="$(jq -r '.version' package.json)"

if [[ "$VERSION_QUALIFIER" == "" ]]; then
  QUALIFIER_VERSION="$BASE_VERSION"
else
  QUALIFIER_VERSION="$BASE_VERSION-$VERSION_QUALIFIER"
fi

if [[ "$RELEASE_BUILD" == "true" ]]; then
  FULL_VERSION="$QUALIFIER_VERSION"
  BUILD_ARGS="--release --version-qualifier=$VERSION_QUALIFIER"
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
