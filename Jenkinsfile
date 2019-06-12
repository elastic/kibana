pipeline {
  agent any
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build OSS Distro') {
      steps {
        echo 'Building OSS Distro'
        sh './.ci/run.sh'
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
