###
### install dependencies
###
echo " -- installing node.js dependencies"
yarn kbn bootstrap --offline


###
### verify no git modifications
###

GIT_CHANGES="$(git ls-files --modified)"
if [ "$GIT_CHANGES" ]; then
  echo -e "\n${RED}ERROR: 'yarn kbn bootstrap' caused changes to the following files:${C_RESET}\n"
  echo -e "$GIT_CHANGES\n"
  exit 1
fi
