#!/bin/bash

NODE_OPTIONS= yarn kbn bootstrap

# Patch node_modules so we can start Kibana in dev mode
sed -i 's/hashType = hashType || '\''md5'\'';/hashType = hashType || '\''sha1'\'';/g' node_modules/file-loader/node_modules/loader-utils/lib/getHashDigest.js
sed -i 's/const hash = createHash("md4");/const hash = createHash("sha1");/g' node_modules/webpack/lib/ModuleFilenameHelpers.js
sed -i 's/contentHash: createHash("md4")/contentHash: createHash("sha1")/g' node_modules/webpack/lib/SourceMapDevToolPlugin.js
