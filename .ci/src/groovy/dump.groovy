def dumpSizes(xs){
     xs.each { dumpSize(it) }
}
def dumpSize(String x){
  script {
    sh "du -hcs ${x}"
  }
}
def dumpEnv(){
  sh 'env > env.txt'
  script {
    for (String x: readFile('env.txt').split("\r?\n")) {
      println "# ENV VAR: ${x}"
    }
  }
  // Cleanup
  sh 'rm env.txt'
}
return this
