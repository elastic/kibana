pipeline {
  // TODO: Follow up on Dockerfile-Jenkinsfile integration @ 
  // https://jenkins.io/doc/book/pipeline/docker/
  agent { dockerfile true }
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build OSS Distro') {
      steps {
        echo 'Building OSS Distro'
      }
    }
    stage('Build Default Distro') {
      steps {
        echo 'Building Default Distro' 
        echo 'Store Default Distro'
      }
    }
    stage('Launch Workers') {
      steps {
        echo 'Launching N workers'
      }
    }
  }
}
