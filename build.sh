#! /bin/bash
# exit if anything returns failure
set -e

BUILT_VERSION="5.3.4"
VERSION="5.3.3"

# return 1 if global command line program installed, else 0
function program_is_installed {
  # set to 1 initially
  local return_=1
  # set to 0 if not found
  type $1 >/dev/null 2>&1 || { local return_=0; }
  # return value
  echo "$return_"
}

function run {
  if [ `program_is_installed 'pleaserun'` -eq "0" ]; then
    echo "  Error: pleaserun is not installed. You can install it by running 'sudo gem install pleaserun -v 0.0.24'"
    exit;
  fi

  if [ `program_is_installed 'fpm'` -eq "0" ]; then
    # Had to revert back to an old fpm in order to get around the "unrecognized option: --sysv-log-path error when building" that pleaserun was throwing
    echo "  Error: fpm is not installed. You can install it by running 'sudo gem install fpm -v 1.8.1'"
    exit;
  fi

  # build the rpm package
  npm run build -- --rpm
}

run
