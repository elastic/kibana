#!/bin/bash

# Script to bootstrap the docker compose setup for testing locally.

ANCHOR="YOUR-KIBANA-ROOT-DIRECTORY"

copy_gateway_config_into_config_directory() {
  echo "### copy_gateway_config_into_config_directory"

cat <<EOF >../../../config/gateway.yml
# config/gateway.yml
server:
  port: 3000
  host: "localhost"
  ssl:
    enabled: true
    # Using Kibana test certs
    key: ${ANCHOR}/packages/kbn-dev-utils/certs/kibana.key
    certificate: ${ANCHOR}/packages/kbn-dev-utils/certs/kibana.crt
    certificateAuthorities: ${ANCHOR}/packages/kbn-dev-utils/certs/ca.crt

kibana:
  hosts:
    - "https://localhost:5605"
    - "https://localhost:5606"
  ssl:
    # Using Kibana test certs
    certificate: ${ANCHOR}/packages/kbn-dev-utils/certs/kibana.crt
    certificateAuthorities: ${ANCHOR}/packages/kbn-dev-utils/certs/ca.crt
    verificationMode: certificate

logging:
  root:
    appenders: ["console"]
    level: "all"

EOF
}
copy_env_file_for_docker() {
  echo "### copy_env_file_for_docker"

  cp .env.example .env
}
final() {
  echo ""
  echo "### Pls ensure you modify the paths to certificates within KIBANA_ROOT/config/gateway.yml"
  echo ""
}


copy_gateway_config_into_config_directory
copy_env_file_for_docker
final

