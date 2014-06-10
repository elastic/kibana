#!/bin/bash -e
pushd `dirname $0` > /dev/null
SCRIPT_PATH=`pwd`
popd > /dev/null

APP=${APP:-kibana}
LIVE_URL_HOST=${LIVE_URL_HOST:-kibana}
LIVE_URL_DOMAIN=${LIVE_URL_DOMAIN:-cityindex.logsearch.io}
RUN_SMOKE_TESTS=${RUN_SMOKE_TESTS:-$SCRIPT_PATH/run_smoke_tests.sh}
DIST_FOLDER=${DIST_FOLDER:-dist/}

CF_DOMAIN=${CF_DOMAIN:-apps.cityindex.logsearch.io}
CF_APPS_DOMAIN=${CF_APPS_DOMAIN:-apps.cityindex.logsearch.io}
CF_API=${7:-https://api.$CF_DOMAIN}
CF_USER=${CF_USER:?"env CF_USER must be defined"}
CF_PASSWD=${CF_PASSWD:?"env CF_PASSWD must be defined"}
CF_ORG=${CF_ORG:?"env CF_ORG must be defined"}
CF_SPACE=${CF_SPACE:?"env CF_SPACE must be defined"}
CF_HOME=$SCRIPT_PATH

# sed -l basically makes sed replace and buffer through stdin to stdout
# so you get updates while the command runs and dont wait for the end
# e.g. npm install | indent
indent() {
  c='s/^/       /'
  case $(uname) in
    Darwin) sed -l "$c";; # mac/bsd sed: -l buffers on line boundaries
    *)      sed -u "$c";; # unix/gnu sed: -u unbuffered (arbitrary) chunks of data
  esac
}

echo "=====> Checking dependancies"
echo $(date)

	if [[ ! "$(cf --version)" =~ "cf version 6" ]]; then
	  echo "!!! cf version (>= 6.1.1) must be installed and in the PATH"
	  exit 1
	fi
	echo "$(cf --version)" | head -n 1 | indent

echo "=====> Connecting to CF at $CF_API as $CF_USER"
echo $(date)
	echo "Connecting from IP $(curl -s icanhazip.com)"
	cf login -a $CF_API -u $CF_USER -p "$CF_PASSWD" -o $CF_ORG -s $CF_SPACE --skip-ssl-validation | indent

echo "=====> Ensuring $LIVE_URL_HOST.$LIVE_URL_DOMAIN exists"	
echo $(date)

	if [[ ! "$(cf routes)" =~ "$LIVE_URL_HOST" ]]; then
		echo "!!! Route $LIVE_URL_HOST.$LIVE_URL_DOMAIN must be set up before running this script"
	  	exit 1
	fi

echo "=====> Starting zero-downtime deploy..."
echo $(date)
	cf apps | grep $APP | indent
	echo "Moving $APP to $APP-old "
	cf delete $APP-old -f | indent
	cf rename $APP $APP-old | indent
	cf apps | grep $APP | indent

echo "=====> Pushing new version..."
echo $(date)
	CF_TRACE=false cf push $APP -p=$DIST_FOLDER -m=64m -i=3 -b=https://github.com/cloudfoundry-community/nginx-buildpack.git | indent
	cf apps | grep $APP | indent

echo "=====> Running smoke tests against $APP"
echo $(date)
$RUN_SMOKE_TESTS http://$APP.$CF_APPS_DOMAIN

echo "=====> Routing $LIVE_URL_HOST.$LIVE_URL_DOMAIN to $APP"
echo $(date)
cf map-route $APP $LIVE_URL_DOMAIN -n $LIVE_URL_HOST | indent

echo "=====> Stopping old $APP-old"
echo $(date)
	cf stop $APP-old | indent
	cf apps | grep $APP | indent

echo "=====> Completed!"
echo $(date)

	echo "live-url:$LIVE_URL_HOST.$LIVE_URL_DOMAIN"