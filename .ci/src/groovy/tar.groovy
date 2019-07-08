def branchName(){
  return sh (
    script: 'git rev-parse --abbrev-ref HEAD',
    returnStdout: true
  ).trim()
}
def tarName(envObj){
  return "${envObj.JOB_NAME}-${branchName()}-${envObj.BUILD_ID}.tgz"
}
def unTar(envObj){
  clearDir(envObj.WORKSPACE_DIR)
  dir(envObj.WORKSPACE_CACHE_DIR){
    sh 'pwd'
    sh 'ls -la'
    sh "tar xfz ${tarName()} --strip-components=4 -C ${envObj.WORKSPACE_DIR}"
  }
}
def tarGlobs(envObj){
  return "${envObj.WORKSPACE_DIR}/elasticsearch/* ${envObj.WORKSPACE_DIR}/${JOB_NAME}/*"
}
def tarAll(envObj){
  dir(envObj.WORKSPACE_CACHE_DIR){
    script {
      sh "tar -czf ${envObj.WORKSPACE_CACHE_NAME} ${tarGlobs(envObj)}"
    }
  }
}
return this
