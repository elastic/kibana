#!/usr/bin/env bash

echo "This is an internal Dig Dug maintenance script. It updates the"
echo "API documentation in the gh-pages branch."
echo ""
echo "If you want to update the API docs, press 'y'."
read -s -n 1

if [ "$REPLY" != "y" ]; then
	echo "Aborted."
	exit 0
fi

SUPPORT_DIR=$(cd $(dirname $0) && pwd)
ROOT_DIR=$(cd "$SUPPORT_DIR/.." && pwd)
BUILD_DIR="$ROOT_DIR/build_doc"

cd "$ROOT_DIR"
git clone -b gh-pages . "$BUILD_DIR"
cd "$BUILD_DIR"
git rm -r '*'
cd "$ROOT_DIR"
jsdoc -c "$SUPPORT_DIR/jsdoc.conf" -t "../jsdoc-theme/catalyst/" -d "$BUILD_DIR" --verbose *.js README.md
cd "$BUILD_DIR"
git add -A
git commit -a -m "Rebuild documentation"
git push origin gh-pages

cd "$ROOT_DIR"
rm -rf "$BUILD_DIR"
