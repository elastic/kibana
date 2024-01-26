#!/usr/bin/env bash

args=("$@")
re2_version=${args[0]}

if [ -z "$re2_version" ]; then
  echo "Usage: ./download_re2.sh [re2_version]"
  exit 1
fi

archs=(
  "darwin-arm64"
  "darwin-x64"
  "linux-musl-x64"
  "linux-x64"
  "win32-x64"
)
node_api_versions=( 108 115 )
formats=( "br" "gz" )

echo "Downloading builds of re2 version ${re2_version} to /tmp/re2"
mkdir /tmp/re2

for node_api_version in "${node_api_versions[@]}"; do
  echo "  Node.js API version ${node_api_version}"

  for arch in "${archs[@]}"; do
    for format in "${formats[@]}"; do
      url="https://github.com/uhop/node-re2/releases/download/${re2_version}/${arch}-${node_api_version}.${format}"
      echo "    ${url}"
      (cd /tmp/re2 && curl -s -L -O "${url}")
    done
  done
done

echo
echo "Calculating shasums for downloaded artifacts..."
echo
shasum -a 256 /tmp/re2/*
