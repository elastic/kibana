pipeline {
  agent any
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build') {
      steps {
        echo 'Building..'
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
