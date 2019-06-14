pipeline {
  agent { label 'master || immutable' }
  environment {
    BASE_DIR = "."
  }
  stages {
    stage('Build Stuff? :)') {
      steps {
        withEnvWrapper() {
            dir("${BASE_DIR}"){
                sh './.ci/run.sh'
            }
        }
      }
    }
    // stage('Build OSS Distro') {
    //   steps {
    //     echo 'Building OSS Distro'
    //   }
    // }
    // stage('Build Default Distro') {
    //   steps {
    //     echo 'Building Default Distro' 
    //     echo 'Store Default Distro'
    //   }
    // }
    // stage('Launch Workers') {
    //   steps {
    //     echo 'Launching N workers'
    //   }
    // }
  }
}
