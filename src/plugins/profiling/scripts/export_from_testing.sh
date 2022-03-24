#!/usr/bin/env bash

# Exit on use of undefined variables and on command failures.
set -eu

die() {
    if [[ "$@" ]]; then
        echo -e "$@\n" >&2
    fi
    exit 1
}

usage() {
  die "Usage: $0 [options]\n" \
  "  --dateFrom <date>  Start of data, date format (e.g. \"2022-02-28T00:00:00Z\") or a unix timestamp\n" \
  "  --dateTo <date>    End of data\n" \
  "\n" \
  "The data will be exported into the current working directory.\n" \
  "\n" \
  "You need to put the credentials into the ELASTIC_TESTING_CREDENTIALS env var (...=\"user:pw\")"
}

get_timestamp() {
  local date_input=$1

  if [[ "${date_input}" =~ ^[0-9]+$ ]]; then
    echo "${date_input}"
  else
    echo $(date +%s --date="${date_input}")
  fi
}

export_events() {
  local index=$1
  local from=$2
  local to=$3

  docker run --rm -ti --net=host -v "$PWD:/data" -w /data -e "NODE_OPTIONS=--max_old_space_size=8192" \
    elasticdump/elasticsearch-dump:latest \
    --input="https://""${ELASTIC_TESTING_CREDENTIALS}""@profiling-es.35.240.6.93.ip.es.io/${index}" \
    --output="${index}-data_${from}_${to}.json.gz" \
    --type=data  --fsCompress --noRefresh --limit=100000 --support-big-int \
    --searchBody='
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "ProjectID": 5
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "'"$from"'",
              "lt": "'"$to"'",
              "format": "epoch_second"
            }
          }
        }
      ]
    }
  }
}'
}

export_index() {
  local index=$1

  docker run --rm -ti --net=host -v "$PWD:/data" -w /data -e "NODE_OPTIONS=--max_old_space_size=8192" \
    elasticdump/elasticsearch-dump:latest \
    --input="https://""${ELASTIC_TESTING_CREDENTIALS}""@profiling-es.35.240.6.93.ip.es.io/${index}" \
    --output="${index}-data.json.gz" \
    --type=data  --fsCompress --noRefresh --limit=100000 --support-big-int
}

if [[ "$ELASTIC_TESTING_CREDENTIALS" == "" ]]; then
  usage
fi

date_from=0
date_to=$(date +%s --date="now")

while [[ $# -gt 0 ]]; do
  case $1 in
    --dateFrom)
      date_from=$(get_timestamp "$2")
      shift 2
      ;;
    --dateTo)
      date_to=$(get_timestamp "$2")
      shift 2
      ;;
    *)
      usage
      ;;
    esac
done

[[ "$date_to" -le "$date_from" ]] && die "Invalid time range"

# Pull latest docker image
docker pull elasticdump/elasticsearch-dump:latest

# Export full events table
export_events "profiling-events-all" "$date_from" "$date_to"

# Export down-sampled tables
for ((i = 1; i <= 11; i++)); do
  export_events "profiling-events-5pow$(printf '%02d' i)" "$date_from" "$date_to"
done

# We need all stacktraces, stackframes and executables as 'LastSeen' may be outside [date_from, date_to].
export_index "profiling-stacktraces"
export_index "profiling-stackframes"
export_index "profiling-executables"

echo -e '
 Import the data with ...
 or upload to S3 with
     for i in profiling-*; do aws s3 cp $i s3://oblt-profiling-es-snapshot/; done
'
