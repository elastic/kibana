#!/bin/bash

#echo "RUNNING 1/3 Benchmark"
# 1/3
#. ./run_performance_test.sh -h 46d8293992fff00931c891f41cbd5435f6588c78 -d 0 -g "dashboard app"
#. ./run_performance_test.sh -h 46d8293992fff00931c891f41cbd5435f6588c78 -d 20 -g "dashboard app"

#echo "RUNNING upstream/master at 20 packet"
# Run the latest on master 
#. ./run_performance_test.sh -h upstream/master -d 20
#. ./run_performance_test.sh -h upstream/master -d 20 -x true


#echo "RUNNING upstream/master at 0 packet delay"
#. ./run_performance_test.sh -h upstream/master -d 0
#. ./run_performance_test.sh -h upstream/master -x true -d 0

#. ./run_performance_test.sh -h upstream/master -g "dashboard app" -d 0 -r 1
#. ./run_performance_test.sh -h upstream/master -g "Canvas app" -d 0 -r 1 -x true
#. ./run_performance_test.sh -h upstream/master -g "dashboard app" -d 20 -r 2
#. ./run_performance_test.sh -h upstream/master -g "Canvas app" -d 20 -r 2 -x true
#echo "RUNNING 5 days ago"
#. ./run_performance_test.sh -h 7ffe38569e48cbebfeb00bd084799d8aa48f38f2 -g "dashboard app"
#. ./run_performance_test.sh -h 7ffe38569e48cbebfeb00bd084799d8aa48f38f2 -g "discover app"
#echo "RUNNING 15 days ago"
. ./run_performance_test.sh -h 054ec7036d01a1a2f817b0e50fa1b957f9562a5c -g "dashboard app" 
. ./run_performance_test.sh -h 054ec7036d01a1a2f817b0e50fa1b957f9562a5c -g "discover app" 

echo "RUNNING 30 days ago"
. ./run_performance_test.sh -h 5fee62b1dbb8fcee5efa436acc6a28a0a57e7df5 -g "dashboard app" 
. ./run_performance_test.sh -h 5fee62b1dbb8fcee5efa436acc6a28a0a57e7df5 -g "discover app" 
echo "RUNNING 45 days ago"
. ./run_performance_test.sh -h bb7c9ed9d92c9ad0845c653826f6e2b7e243fac4 -g "dashboard app" 
. ./run_performance_test.sh -h bb7c9ed9d92c9ad0845c653826f6e2b7e243fac4 -g "discover app" 


"RUNNING 5 days ago"
. ./run_performance_test.sh -h 7ffe38569e48cbebfeb00bd084799d8aa48f38f2 -g "dashboard app" -t true 
. ./run_performance_test.sh -h 7ffe38569e48cbebfeb00bd084799d8aa48f38f2 -g "discover app"  -t true 
echo "RUNNING 15 days ago"
. ./run_performance_test.sh -h 054ec7036d01a1a2f817b0e50fa1b957f9562a5c -g "dashboard app" -t true 
. ./run_performance_test.sh -h 054ec7036d01a1a2f817b0e50fa1b957f9562a5c -g "discover app" -t true

echo "RUNNING 30 days ago"
. ./run_performance_test.sh -h 5fee62b1dbb8fcee5efa436acc6a28a0a57e7df5 -g "dashboard app" -t true
. ./run_performance_test.sh -h 5fee62b1dbb8fcee5efa436acc6a28a0a57e7df5 -g "discover app" -t true
echo "RUNNING 45 days ago"
. ./run_performance_test.sh -h bb7c9ed9d92c9ad0845c653826f6e2b7e243fac4 -g "dashboard app" -t true
. ./run_performance_test.sh -h bb7c9ed9d92c9ad0845c653826f6e2b7e243fac4 -g "discover app" -t true
