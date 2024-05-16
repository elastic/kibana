#!/usr/bin/env bash

if [ -z "$KIBANA_BUILD_LOCATION" ]; then
  export KIBANA_BUILD_LOCATION="/usr/share/kibana"
fi

# a FTR failure will result in the script returning an exit code of 10
exitCode=0

configs=(
  "x-pack/test/reporting_functional/reporting_and_security.config.ts"
  "x-pack/test/saved_object_api_integration/security_and_spaces/config_trial.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group1/config.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group2/config.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group3/config.ts"
  "x-pack/test/alerting_api_integration/security_and_spaces/group4/config.ts"
  "x-pack/test/functional/apps/saved_objects_management/config.ts"
  "x-pack/test/functional/apps/user_profiles/config.ts"
  "x-pack/test/functional/apps/security/config.ts"
)

cd /home/vagrant/kibana

for config in "${configs[@]}"; do
  set +e
  node /home/vagrant/kibana/scripts/functional_tests \
    --bail \
    --kibana-install-dir "$KIBANA_BUILD_LOCATION" \
    --config="$config"
  lastCode=$?
  set -e

  if [ $lastCode -ne 0 ]; then
    exitCode=10
    echo "FTR exited with code $lastCode"
    echo "^^^ +++"

    if [[ "$failedConfigs" ]]; then
      failedConfigs="${failedConfigs}"$'\n'"- ${config}"
    else
      failedConfigs="### Failed FTR Configs"$'\n'"- ${config}"
    fi
  fi
done

if [[ "$failedConfigs" ]]; then
  echo "$failedConfigs" >/home/vagrant/ftr_failed_configs
fi

echo "--- FIPS smoke test complete"

exit $exitCode
