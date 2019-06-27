#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

# source src/dev/ci_setup/extract_bootstrap_cache.sh
# source src/dev/ci_setup/setup.sh
# source src/dev/ci_setup/checkout_sibling_es.sh

echo "\n\t### STAGE: ${STAGE}"

case "$STAGE" in
bootstrap)
  source src/dev/ci_setup/extract_bootstrap_cache.sh
  source src/dev/ci_setup/setup.sh
  source src/dev/ci_setup/checkout_sibling_es.sh
  # create and upload workspace cache to gcs

  ;;
# build-oss)
#   node scripts/build --debug --oss
#   # create and upload oss workspace cache to gcs
#   ;;
# build-default)
#   echo " -> building and extracting default Kibana distributable for use in functional tests"
#   cd "$KIBANA_DIR"
#   node scripts/build --debug --no-oss
#   linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
#   installDir="$PARENT_DIR/install/kibana"
#   mkdir -p "$installDir"
#   tar -xzf "$linuxBuild" -C "$installDir" --strip=1
#   # create and upload default cache to gcs
#   ;;
# kibana-intake)
#   # dload ws cache
#   ./test/scripts/jenkins_unit.sh
#   echo "\n\t### kibana-intake"
#   ;;
# kibana-ciGroup*)
# # dload oss cache
#   export CI_GROUP="${STAGE##kibana-ciGroup}"
# #  ./test/scripts/jenkins_ci_group.sh
#   echo "\n\t### kibana-ciGroup*"
#   ;;
# kibana-visualRegression*)
# # dload oss cache
#   ./test/scripts/jenkins_visual_regression.sh
#   ;;
# kibana-firefoxSmoke*)
#   ./test/scripts/jenkins_firefox_smoke.sh
#   ;;
# x-pack-intake)
#   # just a ws cache
#   echo "\n\t### x-pack-intake"
#   ;;
# x-pack-ciGroup*)
#   # default cache
#   export CI_GROUP="${STAGE##x-pack-ciGroup}"
# #  ./test/scripts/jenkins_xpack_ci_group.sh
#   echo "\n\t### x-pack-ciGroup*"
#   ;;
# x-pack-visualRegression*)
#   # default cache
#   ./test/scripts/jenkins_xpack_visual_regression.sh
#   ;;
# x-pack-firefoxSmoke*)
#   # default cache
#   ./test/scripts/jenkins_xpack_firefox_smoke.sh
#   ;;
*)
  echo "STAGE '$STAGE' is not implemented."
  exit 1
  ;;
esac
