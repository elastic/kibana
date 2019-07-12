#!/usr/bin/env bash

RESOURCES_DIR="./src/resources"
WAR_PATH="${RESOURCES_DIR}/jenkins.war"
TEMP_JUNKINS_BINARY="/tmp/jenkins"

bootstrapJunkins () {
  wget -r -O ${WAR_PATH} http://mirrors.jenkins.io/war-stable/latest/jenkins.war
  unzip -o ${WAR_PATH} -d ${TEMP_JUNKINS_BINARY}
  JENKINS_HOME="/tmp/jenkins_home" java -jar ${WAR_PATH}
}
bootstrapJunkins

# startJunkins () {
#   ./app/target/appassembler/bin/jenkinsfile-runner -w ${TEMP_JUNKINS_BINARY} \
#   -p ${JENKINS_HOME}/plugins -f ~/foo/ -a "param1=Hello&param2=value2"
# }
# startJunkins

# ${RESOURCES_DIR}/jenkinsfile-runner/app/target/appassembler/bin/jenkinsfile-runner -w ${TEMP_JUNKINS_BINARY} -p ${TEMP_JUNKINS_BINARY}_home/plugins -f ~/foo/ -a "param1=Hello&param2=value2"
# ./app/target/appassembler/bin/jenkinsfile-runner -w ${TEMP_JUNKINS_BINARY} -p ${JENKINS_HOME}/plugins -f ~/foo/ -a "param1=Hello&param2=value2"
