#!/bin/bash


# Bootstrap the CC App
src/dev/code_coverage/shell_scripts/query_app_initial_data.sh

# Populate the CC App with bootstrapped dat file
node src/dev/code_coverage/node_scripts/populate_cc_app/index.js ./bootstrapped.dat src/dev/code_coverage/cc_app/public/initial_data.js

# build cc app
pushd src/dev/code_coverage/cc_app
yarn
yarn build:prod
popd

# copy built app over to it's final resting place :)
cp -R src/dev/code_coverage/cc_app/build src/dev/code_coverage/live_cc_app
