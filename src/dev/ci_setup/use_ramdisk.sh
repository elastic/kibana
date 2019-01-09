#!/usr/bin/env bash

set -e

dir="$(pwd)"
dirTmp="${dir}-tmp"

echo " -> moving $dir onto a ram disk"
cd ..
mv "$dir" "$dirTmp"
mkdir "$dir"
sudo mount -t tmpfs -o size=5g tmpfs "$dir"
cp -R "$dirTmp/" "$dir/"
cd "$dir"
rm -rf "$dirTmp"

echo " -> $dir is now on a 5GB ram disk"
