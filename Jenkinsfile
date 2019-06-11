pipeline {
  agent any
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Checkout') {
      steps {
        echo 'Building..'
        git 'git@github.com:elastic/kibana.git'
      }
    }
    stage('Test') {
      steps {
        echo 'Testing..'
        dir("${BASE_DIR}"){
              sh './.ci/run.sh'
            }
      }
    }
    stage('Deploy') {
      steps {
        echo 'Deploying....'
      }
    }
  }
}
