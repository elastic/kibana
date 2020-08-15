#!/bin/bash

echo "### Bootstrap Stats"
echo ""

STATS_PATH=$1
STATS=$2

echo "### STATS: $STATS"
#touch src/dev/code_coverage/www/stat_data.js
touch $STATS_PATH
ls -la $STATS_PATH

echo "###  Bootstrap Stats - Complete"
echo ""






#echo "const artifactStats = `" > ${statDatFilePath}
#echo ${artifactStats} >> ${statDatFilePath}
#echo "`;" >> ${statDatFilePath}
#echo " " >> ${statDatFilePath}

