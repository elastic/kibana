#!/usr/bin/env groovy

println "\n\t### Yay! We can test Jenkinsfile's now!"

def getJunkins = {
  "curl -o ${it}/jenkins.war http://mirrors.jenkins.io/war-stable/latest/jenkins.war"
    .execute()
}

getJunkins('./src/resources')
