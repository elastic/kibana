#!/usr/bin/env bash

wget -O ./src/resources/jenkins.war http://mirrors.jenkins.io/war-stable/latest/jenkins.war
unzip ./src/resources/jenkins.war -d /tmp/jenkins
