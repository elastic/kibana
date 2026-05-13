SSL_KIBANA="--kibanaUrl=http://localhost:5601"
EIS_QA="--esArgs=xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud"


nvm use
if [[ "$1" == "ssl" ]]; then
   echo yarn es serverless --license trial --projectType elasticsearch_search $EIS_QA $SSL_KIBANA --no-uiam
   yarn es serverless --license trial --projectType elasticsearch_search $EIS_QA $SSL_KIBANA --no-uiam
else
   echo yarn es serverless --license trial --projectType elasticsearch_search $EIS_QA --no-uiam
   yarn es serverless --license trial --projectType elasticsearch_search $EIS_QA --no-uiam
fi
