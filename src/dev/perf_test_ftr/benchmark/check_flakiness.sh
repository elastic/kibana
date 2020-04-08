#!/bin/bash

while getopts g:r:d: option
do
case "${option}"
in
g) GIT_HEAD=${OPTARG};;
r) RUN_COUNT=${OPTARG};;
d) PACKET_DELAY=${OPTARG};;
esac
done

if [ "$RUN_COUNT" = "" ]
then
  RUN_COUNT=1
fi

if [ "$PACKET_DELAY" = "" ]
then
  PACKET_DELAY=0
else
 sudo /sbin/tc qdisc del dev lo root
 sudo /sbin/tc qdisc add dev lo root netem delay ${PACKET_DELAY}ms
fi

cd ../kibana
git fetch stacey

regExpHeadCommit="HEAD is now at ([a-zA-Z0-9]+) (.*) (\(#([0-9]+)\))?"
gitHeadLine=
gitHash=
prNumber=
gitDescription=

lines=$(git reset --hard ${GIT_HEAD})

if [[ "$lines" =~ $regExpHeadCommit ]]
then
  gitHash="${BASH_REMATCH[1]}"
  gitDescription="${BASH_REMATCH[2]}"
  prNumber="${BASH_REMATCH[4]}"
  echo "Hash: ${gitHash} description: ${gitDescription} prNumber: ${prNumber}"
fi

if [ "$gitDescription" = "" ]; then
  echo "Something went wrong, no description found: ${gitDescription}"
  exit;
fi

# Changes to extend leadfoot timeouts to enable testing slow internet connections
git cherry-pick 15f01a1d5b

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
nvm use
yarn kbn bootstrap

logstashTracking="PACKET_DELAY:${PACKET_DELAY} GIT_HEAD:${GIT_HEAD} GIT_HASH:${gitHash} DESCRIPTION:\"${gitDescription}\""

if [ "$prNumber" != "" ]; then
 logstashTracking="${logstashTracking} PR:${prNumber}"
fi

cd ../benchmark
./benchmark.sh -r ${RUN_COUNT} -a "${logstashTracking}"
echo "TESTING XPACK NOW....."
./benchmark.sh -r ${RUN_COUNT} -x true -a "${logstashTracking}"
