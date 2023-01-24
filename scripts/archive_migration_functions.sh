#!/bin/bash

# ??? Should we migrate
#     x-pack/test/functional/es_archives/security_solution/timelines/7.15.0_space
# ### Yes, it needs migration
#   ### Saved Object type(s) that we care about:
#     index-pattern
#   ### Test file(s) that use it:
#     x-pack/test/api_integration/apis/security_solution/timeline_migrations.ts
#   ### Config(s) that govern the test file(s):
#     x-pack/test/api_integration/config.ts
# The other types it contains:
# config
# index-pattern
# siem-ui-timeline
# siem-ui-timeline-note
# siem-ui-timeline-pinned-event
# space

standard_list="url,index-pattern,query,graph-workspace,tag,visualization,canvas-element,canvas-workpad,dashboard,search,lens,map,cases,uptime-dynamic-settings,osquery-saved-query,osquery-pack,infrastructure-ui-source,metrics-explorer-view,inventory-view,infrastructure-monitoring-log-view,apm-indices"

orig_archive="x-pack/test/functional/es_archives/security_solution/timelines/7.15.0_space"
new_archive="x-pack/test/functional/fixtures/kbn_archiver/security_solution/timelines/7.15.0_space"

testFiles=("x-pack/test/api_integration/apis/security_solution/timeline_migrations.ts")

test_config="x-pack/test/api_integration/config.ts"

list_stragglers() {

  echo "### OSS"
  while read -r x; do
    local a=$(grep -l '"index": ".kibana' "$x")
    if [ -n "$a" ]; then
      echo "${a%/mappings.json}"
    fi
  done <<<"$(find test/functional/fixtures/es_archiver -name mappings.json)"

  echo
  echo

  echo "### X-PACK"
  while read -r y; do
    local b=$(grep -l '"index": ".kibana' "$y")
    if [ -n "$b" ]; then
      echo "${b%/mappings.json}"
    fi
  done <<<"$(find x-pack/test/functional/es_archives -name mappings.json)"

}

curl_so_count() {
  local so=${1:-search-session}
  local count
  count=$(curl -s -XGET "http://elastic:changeme@localhost:9220/.kibana/_count" -H "kbn-xsrf: archive-migration-functions" -H "Content-Type: application/json" -d'
{
  "query": {
    "bool": {
      "should": [
        {
          "match_phrase": {
            "type": "${so}"
          }
        }
      ]
    }
  }
}' | jq '.count')

  echo "  ### [${so}] count: ${count}"
}

watch_so_count() {
  local so=${1:-search-session}

  while true; do
    curl_so_count "$so"
    sleep 1
  done
}

create_space() {
  # Ex: Id, Name, and Disabled Features.
  #   create_space tre "Tre Space" apm,ml,canvas,dashboard,visualize,maps,monitoring,uptime
  # Ex: Id. Name is generated
  #   create_space rashmi
  # Ex: Id and Name. No disabled features.
  #   create_space another-space "Another Space"
  local id=${1:-sales}
  local upperCased
  upperCased=$(echo "${id:0:1}" | tr '[:lower:]' '[:upper:]')"${id:1}"
  local name=${2:-$upperCased}
  local disabledFeatures=${3:-}

  if [[ -n $3 ]]; then
    disabledFeatures="$3"
  fi

  # Use jq to create the i and n variables, then inject them.
  local payload
  payload=$(jq -n --arg i "$id" --arg n "$name" --arg df "$disabledFeatures" \
    '{ "id": $i, "name": $n, "disabledFeatures": [$df] }')

  curl -H "Content-Type: application/json" -H "kbn-xsrf: archive-migration-functions" \
    -X POST -d "$payload" \
    --user elastic:changeme http://localhost:5620/api/spaces/space
}

delete_space() {
  local id=${1:?Need a space id.}

  curl -H "kbn-xsrf: archive-migration-functions" \
    -X DELETE \
    --user elastic:changeme http://localhost:5620/api/spaces/space/"$id"
}

# Just a note that this is using Gnu date.
# On OSX if you don't install this, and instead use the native date you only get seconds.
# With gdate you can something like nanoseconds.
alias timestamp='while read line; do echo "[`gdate +%H:%M:%S.%N`] $line"; done'

arrayify_csv() {
  local xs=${1}
  echo "$xs" | tr ',' '\n' | uniq | sort
}

intersection() {
  local containedTypesArr=("$@")
  local standardListArr
  standardListArr=($(arrayify_csv "$standard_list"))

  intersections=()

  for a in "${containedTypesArr[@]}"; do
    for b in "${standardListArr[@]}"; do
      if [[ "$a" == "$b" ]]; then
        intersections+=("$a")
      fi
    done
  done

  echo "${intersections[@]}"
}

is_zipped() {
  local archive=$1

  local zip
  zip=$(find "$archive" -maxdepth 1 -type f -name '*.gz' 2>/dev/null)
  if [[ "$zip" == "" ]]; then
    echo ""
  else
    echo "$zip"
  fi
}

unzip_and_keep() {
  local archive=$1

  local zip
  zip=$(find "$archive" -maxdepth 1 -type f -name '*.gz')
  gunzip --keep "$zip"
}

_guard() {
  local archive=$1
  local failures=()
  local archiveJson="${archive}/data.json"

  if [[ ! -d "$archive" ]]; then
    failures+=("Archive does not exist")
  fi

  if [ "${#failures[@]}" -eq 0 ]; then
    local zipped
    zipped=$(is_zipped "$archive")
    if [[ "$zipped" != "" && ! -f "$archiveJson" ]]; then
      unzip_and_keep "$archive"
    fi

    local containsDotKibanaRefs
    containsDotKibanaRefs=$(grep -is '"index": ".kibana' "$archiveJson")
    if [[ "$containsDotKibanaRefs" == "" ]]; then
      failures+=(".kibana is not mentioned within the archive")
    fi
  fi

  echo "${failures[@]}"
}

_types() {
  local archive=${1:-$orig_archive}
  local archiveJson="${archive}/data.json"

  if [[ -f "${archive}/data.json" ]]; then
    local typesList
    typesList=$(jq 'select(.value.source.type | length > 0) | .value.source.type' "$archiveJson")
    echo "$typesList" | sed 's/^.//;s/.$//' | sort | uniq # The sed command drops the first and last characters.
  fi
}

_find_config() {
  local test_file=${1}

  local current
  local parent
  local grandParent
  local greatGrand
  current=$(dirname "$test_file")
  parent=$(dirname "$current")
  grandParent=$(dirname "$parent")
  greatGrand=$(dirname "$grandParent")

  local dirs=("$current" "$parent" "$grandParent" "$greatGrand")

  local configs=()
  local config
  for x in "${dirs[@]}"; do
    config=$(find "$x" -maxdepth 1 -type f -name '*config.js' -or -name '*config.ts')
    if [ -n "$config" ]; then
      configs+=("$config")
    fi
  done

  echo "${configs[@]}"
}

uniqueify() {
  local xs=("$@")
  local xss=()
  for x in $(printf "%s\n" "${xs[@]}" | sort -u); do
    if [[ -n "$x" ]]; then
      xss+=("$x")
    fi
  done
  echo "${xss[@]}"
}

find_configs() {
  local testFiles=("$@")
  local configs=()
  local uniqConfigs=()

  for testFile in "${testFiles[@]}"; do
    configs+=($(_find_config "$testFile"))
  done

  uniqConfigs=($(uniqueify "${configs[@]}"))
  echo "${uniqConfigs[@]}"
}

usages_list() {
  local archive=${1:-$orig_archive}

  grep -q "x-pack" <<<"$archive"
  isInXpack=$?

  local found_usages=()

  if [[ $isInXpack = 0 ]]; then
    found_usages+=($(find x-pack/test -type f -print0 | xargs -0 grep -n "$archive" | cut -d ':' -f 1 | uniq))
  else
    found_usages+=($(find test -type f -print0 | xargs -0 grep -n "$archive" | cut -d ':' -f 1 | uniq))
  fi

  echo "${found_usages[@]}"
}

are_enabled() {
  local testConfigs=("$@")
  local enabledList=($(node scripts/enabled_ftr_configs.js))
  local needsMigration=()

  for enabled in "${enabledList[@]}"; do
    for config in "${testConfigs[@]}"; do
      if [[ "$enabled" == "$config" ]]; then
        needsMigration+=("$config")
      fi
    done
  done
  echo "${needsMigration[@]}"
}

print_list() {
  local xs=("$@")
  for x in "${xs[@]}"; do
    echo "    ${x}"
  done
}

clean_up() {
  local xs
  xs=$(git status -s | grep "??" | grep "data.json" | tr '??' ' ' | xargs)
  for x in "${xs[@]}"; do
    rm -f "$x"
  done
}

should_migrate() {
  local archive=${1:-$orig_archive}
  local archiveJson="${archive}/data.json"
  printf "\n??? Should we migrate \n    %s\n" "$archive"

  local guardResults=($(_guard "$archive"))

  if [ "${#guardResults[@]}" -eq 0 ]; then
    local containedTypes=($(_types "$archive"))
    local intersections=($(intersection "${containedTypes[@]}"))
    local intersectionsLength="${#intersections[@]}"
    if [ "${intersectionsLength}" -gt 0 ]; then
      local foundTestFiles=($(usages_list "$archive"))
      local configs=($(find_configs "${foundTestFiles[@]}"))
      local needsMigration=($(are_enabled "${configs[@]}"))
      if [ "${#needsMigration[@]}" -gt 0 ]; then
        echo "### Yes, it needs migration"
        echo "  ### Saved Object type(s) that we care about:"
        print_list "${intersections[@]}"
        echo "  ### Test file(s) that use it:"
        print_list "${foundTestFiles[@]}"
        echo "  ### Config(s) that govern the test file(s):"
        print_list "${configs[@]}"
      else
        echo "!!! No, do not migrate, it's config(s) is / are not enabled."
        echo "!!! It contains the following saved object(s)"
        print_list "${containedTypes[@]}"
        echo "  !!! For these files:"
        print_list "${foundTestFiles[@]}"
        echo "  !!! Config(s) that govern the test file(s):"
        print_list "${configs[@]}"
      fi
    else
      echo "!!! No, we've found $intersectionsLength saved objects that are listed in the standard_list"
      echo "!!! It contains the following saved object(s)"
      print_list "${containedTypes[@]}"
    fi
  else
    echo "!!! No, it failed the guard(s):"
    echo "${guardResults[@]}"
  fi

  trap clean_up EXIT
}

migrate() {
  set -x
  node scripts/es_archiver.js load "$orig_archive" --config "$test_config"
  node scripts/kbn_archiver.js save "$new_archive" --config "$test_config" --type "$standard_list"
  node scripts/es_archiver.js unload "$orig_archive"
  set +x
}

load_logstash() {
  set -x
  node scripts/es_archiver.js load x-pack/test/functional/es_archives/logstash_functional --config "$test_config"
  set +x
}

load_es() {
  set -x
  node scripts/es_archiver.js load "$orig_archive" --config "$test_config"
  set +x
}

unload_es() {
  set -x
  node scripts/es_archiver.js unload "$orig_archive"
  set +x
}

save_es_archive_without_kibana_objects() {
  local indexName=${1:?"You must pass the name of the index!"}
  set -x
  node scripts/es_archiver.js save "$orig_archive" --config "$test_config" "$indexName"
  set +x
}

save_kbn() {
  local space=${1:-default}

  set -x
  node scripts/kbn_archiver.js --config "$test_config" save "$new_archive" --type $standard_list --space "$space"
  set +x
  #  node scripts/kbn_archiver.js --config x-pack/test/spaces_api_integration/security_and_spaces/config_basic.ts save x-pack/test/functional/fixtures/kbn_archiver/saved_objects/default_space --type search,index-pattern,visualization,dashboard,lens,map,graph-workspace,query,tag,url,canvas-workpad
}

load_kbn() {
  local space=${1:-default}
  local archive=${2:-${new_archive}}

  for x in "${newArchives[@]}"; do
    set -x
    node scripts/kbn_archiver.js --config "$test_config" load "$x" --space "$space"
    set +x
  done
}

load_created_kbn_archive() {
  set -x
  node scripts/kbn_archiver.js --config "$test_config" load "$new_archive"
  set +x
}

unload_kbn() {
  local archive=${1:-${new_archive}}
  set -x
  node scripts/kbn_archiver.js --config "$test_config" unload "$archive"
  set +x
}

unload_kbns() {
  local space=${1:-default}

  for x in "${newArchives[@]}"; do
    set -x
    node scripts/kbn_archiver.js --config "$test_config" unload "$x"
    set +x
  done
}

ping_server() {
  set -x
  server_addr="http://elastic:changeme@localhost:9220"
  curl -k "${server_addr}/_cat/health?v=true"
  set +x
}

server() {
  local config=${1:-$test_config}

  set -x
  node scripts/functional_tests_server.js --config "$config"
  set +x
}

run_test() {
  local config=${1:-$test_config}

  set -x
  node scripts/functional_test_runner --config "$config"
  set +x
}

run_test_extra() {
  set -x
  node scripts/functional_test_runner --config "$test_config" \
    --grep="CSV Generation from SearchSource" \
    --include-tag "ciGroup2" \
    --updateSnapshots
  set +x
}

allowed_types='{
 "types": [
   {
     "name": "config",
     "namespaceType": "single",
     "hidden": false,
     "displayName": "config"
   },
   {
     "name": "url",
     "namespaceType": "single",
     "hidden": false,
     "displayName": "url"
   },
   {
     "name": "index-pattern",
     "namespaceType": "multiple",
     "hidden": false,
     "displayName": "data view"
   },
   {
     "name": "action",
     "namespaceType": "multiple-isolated",
     "hidden": true,
     "displayName": "connector"
   },
   {
     "name": "query",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "query"
   },
   {
     "name": "alert",
     "namespaceType": "multiple-isolated",
     "hidden": true,
     "displayName": "rule"
   },
   {
     "name": "graph-workspace",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "graph-workspace"
   },
   {
     "name": "tag",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "tag"
   },
   {
     "name": "visualization",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "visualization"
   },
   {
     "name": "canvas-element",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "canvas-element"
   },
   {
     "name": "canvas-workpad",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "canvas-workpad"
   },
   {
     "name": "dashboard",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "dashboard"
   },
   {
     "name": "search",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "search"
   },
   {
     "name": "lens",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "lens"
   },
   {
     "name": "map",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "map"
   },
   {
     "name": "cases",
     "namespaceType": "multiple-isolated",
     "hidden": true,
     "displayName": "cases"
   },
   {
     "name": "uptime-dynamic-settings",
     "namespaceType": "single",
     "hidden": false,
     "displayName": "uptime-dynamic-settings"
   },
   {
     "name": "osquery-saved-query",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "osquery-saved-query"
   },
   {
     "name": "osquery-pack",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "osquery-pack"
   },
   {
     "name": "infrastructure-ui-source",
     "namespaceType": "single",
     "hidden": false,
     "displayName": "infrastructure-ui-source"
   },
   {
     "name": "metrics-explorer-view",
     "namespaceType": "single",
     "hidden": false,
     "displayName": "metrics-explorer-view"
   },
   {
     "name": "inventory-view",
     "namespaceType": "single",
     "hidden": false,
     "displayName": "inventory-view"
   },
   {
     "name": "infrastructure-monitoring-log-view",
     "namespaceType": "multiple-isolated",
     "hidden": false,
     "displayName": "log view"
   },
   {
     "name": "apm-indices",
     "namespaceType": "single",
     "hidden": false,
     "displayName": "apm-indices"
   },
   {
     "name": "csp_rule",
     "namespaceType": "agnostic",
     "hidden": false,
     "displayName": "csp_rule"
   },
   {
     "name": "csp-rule-template",
     "namespaceType": "agnostic",
     "hidden": false,
     "displayName": "csp-rule-template"
   }
 ]
}'
_allowed_types() {
  echo "$allowed_types" | jq '.types | .[].name' | sort
}
