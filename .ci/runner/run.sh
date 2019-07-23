docker run --rm -it \
  -v $(pwd)/../..:/workspace \
  -v $(pwd)/config:/config \
  -e CASC_JENKINS_CONFIG=/config \
  jenkins-runner-kibana:local \
  --runWorkspace=/workspace