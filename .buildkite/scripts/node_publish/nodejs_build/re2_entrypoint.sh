#!/usr/bin/env bash

set -e
set -x

re2_full_version="$1"
node_full_version="$2"
node_download_base_url="$3"

if [[ $(arch) == x86_64 ]]; then
  architecture="x64";
else
  architecture="arm64"
fi

cd /home/node/workdir
mkdir -p dist/
mkdir -p src/

## Download and unpack Node.js binary if needed.
node_folder_name="node-v${node_full_version}-linux-${architecture}"
npm_binary="/home/node/workdir/${node_folder_name}/bin/npm"
if [ ! -f "$npm_binary" ]; then
    if [ ! -f "/home/node/workdir/$node_folder_name.tar.xz" ]; then
        curl -fsSLO --compressed "${node_download_base_url}/${node_folder_name}.tar.xz"
    fi

    tar -xf "/home/node/workdir/${node_folder_name}.tar.xz"
fi

cd src

## Download re2 source if needed.
re2_source_folder="/home/node/workdir/src/node-re2-${re2_full_version}"
if [ ! -d "$re2_source_folder" ]; then
    git clone --recurse-submodules --depth 1 --branch 1.17.4 https://github.com/uhop/node-re2.git "${re2_source_folder}"
fi

cd "$re2_source_folder"
export PATH="/home/node/workdir/${node_folder_name}/bin:$PATH"
export DEVELOPMENT_SKIP_GETTING_ASSET=true

export CCACHE_DIR="/home/node/workdir/.ccache-re2-${architecture}"
export CC="ccache gcc"
export CXX="ccache g++"

. /opt/rh/devtoolset-9/enable

npm i --unsafe-perm=true
npm run build --if-present
npm test

mkdir -p /home/node/workdir/dist/
cp "${re2_source_folder}/build/Release/re2.node" "/home/node/workdir/dist/linux-${architecture}-108"
gzip -f "/home/node/workdir/dist/linux-${architecture}-108"
