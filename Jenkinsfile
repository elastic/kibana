pipeline {
  agent any
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build OSS Distro') {
      steps {
        echo 'Building OSS Distro'
        sh 'pwd'
        // sh './ci/run.sh'
        sh label: 'Run the ci script?', script: 'sh ./.ci/run.sh'
        // sh 'ls -laR'
        o 'Store OSS Distro'
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
