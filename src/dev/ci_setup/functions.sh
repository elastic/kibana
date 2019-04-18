###
### Implements github-checks-reporter kill switch when scripts are called from the command line
### $* - all the arguments
### ${*[@]:2} - all the arguments, minus the first one
###
function checks-reporter-with-killswitch() {
  if [ "$CHECKS_REPORTER_ACTIVE" = true ] ; then
    yarn run github-checks-reporter "$@"
  else
    "${@[@]:2}"
  fi
}
