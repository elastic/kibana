#!/usr/bin/env bash

set -e

dir="$(pwd)"
ramDir="/dev/shm/kibana"
dirTmp="${dir}-tmp"

echo " -> moving $dir onto a ram disk"
cd ..
mv "$dir" "$dirTmp"
mkdir "$ramDir"
ln -s "$ramDir" "$dir"
cd "$dir"
git clone "$dirTmp" .
rm -rf "$dirTmp"

echo " -> $dir is now on a ram disk"
