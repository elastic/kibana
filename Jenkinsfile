#!/bin/groovy

library 'kibana-pipeline-library'
kibanaLibrary.load()

slackSend(
  channel: '@brian.seeders',
  username: 'Kibana Operations',
  iconEmoji: ':jenkins:',
  color: 'danger',
  message: 'Test message',
  // blocks: []
)
