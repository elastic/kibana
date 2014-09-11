#!/bin/bash -ex
pushd `dirname $0` > /dev/null
SCRIPT_PATH=`pwd`
popd > /dev/null

pushd $SCRIPT_PATH/..

#Force use of https:// rather than git:// - https://github.com/bower/bower/issues/689#issuecomment-25335135
git config --global url."https://".insteadOf git://

#Install dependancies
npm install

#Build project
grunt build
