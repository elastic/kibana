#!/bin/bash

# Set the default config file
DEFAULT_CONFIG_FILE="./config/kibana.dev.yml"

# Check if a config file is provided and use the default if not
CONFIG_FILE=${1:-$DEFAULT_CONFIG_FILE}

save_and_exit ( ) {
    # the dev process doesn't restart without a sleep after the HTTP calls, not sure why
    sleep 1

    echo "Saving config file to trigger a restart..."

    # Touch the config file to trigger a file change
    touch -c "$CONFIG_FILE"

    exit 0
}

# Parse the YAML file using grep and sed to extract the required values
ELASTICSEARCH_HOSTS=$(grep -E '^elasticsearch.hosts: ' "$CONFIG_FILE" | sed 's/.*: //')
ELASTICSEARCH_USERNAME=$(grep -E '^elasticsearch.username: ' "$CONFIG_FILE" | sed 's/.*: //')
ELASTICSEARCH_PASSWORD=$(grep -E '^elasticsearch.password: ' "$CONFIG_FILE" | sed 's/.*: //')

# Set default values if the extracted values are empty
[ -z "$ELASTICSEARCH_HOSTS" ] && ELASTICSEARCH_HOSTS="http://localhost:9200"
[ -z "$ELASTICSEARCH_USERNAME" ] && ELASTICSEARCH_USERNAME="system_indices_superuser"
[ -z "$ELASTICSEARCH_PASSWORD" ] && ELASTICSEARCH_PASSWORD="changeme"

# Get the list of indices from the _cat/indices API
echo "Getting list of indices..."
INDICES=$(curl -s -X GET "${ELASTICSEARCH_HOSTS}/_cat/indices/.kibana*?format=txt" \
     -u "${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}" | awk '{print $3}')
if [ $? -ne 0 ]; then
    echo "Failed to get the list of indices."
    exit 1
fi

# Convert the list of indices to a comma-separated list
INDICES_CSV=$(echo $INDICES | tr ' ' ',')

if [ -z "$INDICES_CSV" ]; then
    echo "No indices to delete."
    save_and_exit
fi

# Execute the DELETE call with curl using the extracted list of indices
echo "Deleting indices: $INDICES_CSV"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${ELASTICSEARCH_HOSTS}/$INDICES_CSV" \
     -u "${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}")
if [ $? -ne 0 ] && [ "$HTTP_STATUS" != "404" ]; then
    echo "Failed to delete indices."
    exit 1
fi

save_and_exit
