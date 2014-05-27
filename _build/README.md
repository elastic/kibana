## Deploying to apps.cityindex.logsearch.io CF
```
cf create-route live cityindex.logsearch.io -n kibana #do this once
CF_USER=sudobot@labs.cityindex.com CF_PASSWD=xxxxx CF_ORG=cityindex-logsearch-io CF_SPACE=live _build/deploy.sh 
```