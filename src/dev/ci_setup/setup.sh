#!/usr/bin/env bash

set -e

dir="$(pwd)"
cacheDir="${CACHE_DIR:-"$HOME/.kibana"}"

RED='\033[0;31m'
C_RESET='\033[0m' # Reset color

###
### Since the Jenkins logging output collector doesn't look like a TTY
### Node/Chalk and other color libs disable their color output. But Jenkins
### can handle color fine, so this forces https://github.com/chalk/supports-color
### to enable color support in Chalk and other related modules.
###
export FORCE_COLOR=1

###
### check that we seem to be in a kibana project
###
if [ -f "$dir/package.json" ] && [ -f "$dir/.node-version" ]; then
  echo "Setting up node.js and yarn in $dir"
else
  echo "${RED}src/dev/ci_setup/setup.sh must be run within a kibana repo${C_RESET}"
  exit 1
fi


###
### download node
###
UNAME=$(uname)
OS="linux"
if [[ "$UNAME" = *"MINGW64_NT"* ]]; then
  OS="win"
fi
echo " -- Running on OS: $OS"

nodeVersion="$(cat $dir/.node-version)"
nodeDir="$cacheDir/node/$nodeVersion"

if [[ "$OS" == "win" ]]; then
  nodeBin="$HOME/node"
  nodeUrl="https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
else
  nodeBin="$nodeDir/bin"
  nodeUrl="https://nodejs.org/download/release/v$nodeVersion/node-v$nodeVersion-linux-x64.tar.gz"
fi

echo " -- node: version=v${nodeVersion} dir=$nodeDir"

echo " -- setting up node.js"
if [ -x "$nodeBin/node" ] && [ "$($nodeBin/node --version)" == "v$nodeVersion" ]; then
  echo " -- reusing node.js install"
else
  if [ -d "$nodeDir" ]; then
    echo " -- clearing previous node.js install"
    rm -rf "$nodeDir"
  fi

  echo " -- downloading node.js from $nodeUrl"
  mkdir -p "$nodeDir"
  if [[ "$OS" == "win" ]]; then
    nodePkg="$nodeDir/${nodeUrl##*/}"
    curl --silent -o $nodePkg $nodeUrl
    unzip -qo $nodePkg -d $nodeDir
    mv "${nodePkg%.*}" "$nodeBin"
  else
    curl --silent "$nodeUrl" | tar -xz -C "$nodeDir" --strip-components=1
  fi

fi

###
### "install" node into this shell
###
if [[ "$OS" != "win" ]]; then
    export PATH="$nodeBin:$PATH"
    hash -r
fi

###
### downloading yarn
###
yarnVersion="$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")"
if [[ $OS == 'win' ]]; then
    npm install -g yarn@^${yarnVersion}
else
    yarnUrl="https://github.com/yarnpkg/yarn/releases/download/v$yarnVersion/yarn-$yarnVersion.js"
    yarnDir="$cacheDir/yarn/$yarnVersion"
    if [ -z "$yarnVersion" ]; then
      echo " ${RED}!! missing engines.yarn in package.json${RESET_C}";
      exit 1
    elif [ -x "$yarnDir/bin/yarn" ] && [ "$($yarnDir/bin/yarn --version)" == "$yarnVersion" ]; then
      echo " -- reusing yarn install"
    else
      if [ -d "$yarnDir" ]; then
        echo " -- clearing previous yarn install"
        rm -rf "$yarnDir"
      fi

      echo " -- downloading yarn from $yarnUrl"
      mkdir -p "$yarnDir/bin"
      curl -L --silent "$yarnUrl" > "$yarnDir/bin/yarn"
      chmod +x "$yarnDir/bin/yarn"
    fi
fi

###
### "install" yarn into this shell
###
if [[ "$OS" != "win" ]]; then
    export PATH="$yarnDir/bin:$PATH"
    yarnGlobalDir="$(yarn global bin)"
    export PATH="$PATH:$yarnGlobalDir"
    hash -r
fi

###
### install dependencies
###
echo " -- installing node.js dependencies"
yarn config set cache-folder "$cacheDir/yarn"
yarn kbn bootstrap

###
### verify no git modifications
###
GIT_CHANGES="$(git ls-files --modified)"
if [ "$GIT_CHANGES" ]; then
  echo -e "\n${RED}ERROR: 'yarn kbn bootstrap' caused changes to the following files:${C_RESET}\n"
  echo -e "$GIT_CHANGES\n"
  exit 1
fi
