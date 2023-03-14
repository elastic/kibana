#!/usr/bin/env bash

set -e
set -x

release_url_base="$1"
full_version="$2"
config_flags=${3:-""} #"--without-dtrace --without-npm --without-etw"

if [[ $(arch) == x86_64 ]]; then
  architecture="x64";
else
  architecture="arm64"
fi

cd "/home/node/workdir/src/node-${full_version}"

# Compile from source
export CCACHE_DIR="/home/node/workdir/.ccache-${architecture}"
export CC="ccache gcc"
export CXX="ccache g++"

. /opt/rh/devtoolset-9/enable

make -j"$(getconf _NPROCESSORS_ONLN)" binary V= \
  DESTCPU="$architecture" \
  ARCH="$architecture" \
  VARIATION="glibc-217" \
  DISTTYPE="release" \
  RELEASE_URLBASE="$release_url_base" \
  CONFIG_FLAGS="$config_flags"

mkdir -p /home/node/workdir/dist/
mv node-*.tar.?z /home/node/workdir/dist/
