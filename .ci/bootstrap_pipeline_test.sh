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

