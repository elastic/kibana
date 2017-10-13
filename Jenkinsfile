#!/usr/bin/groovy

node('amazon') {
  def root = pwd()

  stage('Setup') {
    git url: 'https://github.com/StatEngine/kibana', branch: 'combined-styling'
  }

  stage('Archive') {
    sh """
      test -f /etc/runtime && source /etc/runtime
      chmod +x build.sh
      ./build.sh

      mkdir -p artifacts
      rm -rf artifacts/*
      #tar --exclude artifacts/* -cjf artifacts/statengine.tar.bz2 .
      #export ARTIFACT=artifacts/statengine.tar.bz2
      #./bin/s3Push.sh
    """
  }
}
