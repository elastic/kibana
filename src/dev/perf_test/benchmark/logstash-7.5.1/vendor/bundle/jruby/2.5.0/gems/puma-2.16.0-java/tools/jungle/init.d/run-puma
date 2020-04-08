#!/bin/bash
app=$1; config=$2; log=$3;
cd $app && exec bundle exec puma -C $config 2>&1 >> $log
