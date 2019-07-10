# Jenkins CI Pipelines

## Pipeline Unit Test Setup

### Download and start local jenkins

This will download, extract, and launch `Junkins` @ http://localhost:8080/  
_From one shell window_
```
pushd KIBANA_PATH/.ci
./bootsrap_pipeline_test.sh 
```

### Prepare local Junkins for use

*Grab the inital password*
`pbcopy < ~/.jenkins/secrets/initialAdminPassword` _to use in Junkins ui_

Using the gui

 - Browse to http://localhost:8080/   
 - Install the recommended plugins
 - Create admin acct

### Run the Pipeline Test
_From a different shell window_
```
pushd KIBANA_PATH/.ci
src/resources/jenkinsfile-runner/app/target/appassembler/bin/jenkinsfile-runner -w /tmp/jenkins -p /tmp/jenkins_home/plugins -f ~/foo/ -a "param1=Hello&param2=value2"
```

> Dont forget to kill the Junkins process when finished