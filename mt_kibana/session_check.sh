#!/usr/bin/env bash
# Checks that browser sessions created through a tenant are stored in, and only work for, that tenant.
set -uo pipefail

export user=mt_user pass=mt-session-pass
jar=$(mktemp)
trap 'rm -f "$jar"' EXIT

port() { echo $((9200 + $(printf '%d' "'$1") - 97)); }

es() {
  local p=$1 method=$2 path=$3 body=${4:-}
  curl -s -u "kibana_system:changeme-$p" -H 'content-type: application/json' \
    -X "$method" "localhost:$(port "$p")$path" ${body:+-d "$body"}
}

kbn() {
  local p=$1
  shift
  curl -s -H "x-elastic-project-id: project-$p" -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: kibana' \
    -H 'content-type: application/json' "$@"
}

login() {
  kbn "$1" -c "$2" -o /dev/null -w '%{http_code}' -X POST localhost:5601/internal/security/login \
    -d "{\"providerType\":\"basic\",\"providerName\":\"basic\",\"currentURL\":\"http://localhost:5601/login\",\"params\":{\"username\":\"$user\",\"password\":\"$pass\"}}"
}
export -f kbn login

me_status() { kbn "$1" -b "$2" -o /dev/null -w '%{http_code}' localhost:5601/internal/security/me; }

hash=$(node -e "process.stdout.write(require('crypto').createHash('sha3-256').update('$user').digest('hex'))")
query="{\"query\":{\"term\":{\"usernameHash\":\"$hash\"}}}"
profile_initials() {
  curl -s -u "elastic:changeme-$1" "localhost:$(port "$1")/_security/profile/$2?data=kibana.avatar" |
    jq -r '.profiles[0].data.kibana.avatar.initials // "none"'
}

sessions() {
  es "$1" POST /.kibana_security_session/_refresh >/dev/null
  es "$1" POST /.kibana_security_session/_count "$query" | jq -r '.count // 0'
}

failed=0
check() {
  if [ "$2" = "$3" ]; then
    echo "$1 PASS"
  else
    echo "$1 FAIL (want $3, got $2)"
    failed=1
  fi
}

# The same user and password on every cluster, so a session replayed against the wrong cluster could authenticate.
for p in a b c; do
  curl -s -o /dev/null -u "elastic:changeme-$p" -H 'content-type: application/json' \
    -X PUT "localhost:$(port "$p")/_security/user/$user" -d "{\"password\":\"$pass\",\"roles\":[\"superuser\"]}"
  es "$p" POST '/.kibana_security_session/_delete_by_query?refresh=true' "$query" >/dev/null
done

check "login through project-b" "$(login b "$jar")" 200
check "session works for project-b" "$(me_status b "$jar")" 200
check "session stored in cluster B" "$(sessions b)" 1
check "session not stored in cluster A" "$(sessions a)" 0

# Profile UIDs derive from the username and realm, so the same UID exists in every cluster the user logged into.
uid=$(kbn b -b "$jar" localhost:5601/internal/security/user_profile | jq -r .uid)
initials=$(LC_ALL=C tr -dc A-Z </dev/urandom | head -c 2)
update_body=$(jq -nc --arg initials "$initials" '{avatar: {initials: $initials}}')
updated=$(kbn b -b "$jar" -o /dev/null -w '%{http_code}' -X POST localhost:5601/internal/security/user_profile/_data \
  -d "$update_body")
check "profile update through project-b" "$updated" 200
read_initials=$(kbn b -b "$jar" 'localhost:5601/internal/security/user_profile?dataPath=avatar' |
  jq -r '.data.avatar.initials // "none"')
check "profile data read through project-b" "$read_initials" "$initials"
check "profile data stored in cluster B" "$(profile_initials b "$uid")" "$initials"
in_a=$([ "$(profile_initials a "$uid")" = "$initials" ] && echo yes || echo no)
check "profile data not stored in cluster A" "$in_a" no

# Written straight to cluster B, so only a bulk get that reads cluster B returns it.
es_initials=$(LC_ALL=C tr -dc A-Z </dev/urandom | head -c 2)
curl -s -o /dev/null -u elastic:changeme-b -H 'content-type: application/json' \
  -X POST "localhost:$(port b)/_security/profile/$uid/_data?refresh=true" \
  -d "$(jq -nc --arg initials "$es_initials" '{data: {kibana: {avatar: {initials: $initials}}}}')"
bulk_body=$(jq -nc --arg uid "$uid" '{uids: [$uid], dataPath: "avatar"}')
bulk_initials=$(kbn b -b "$jar" -X POST localhost:5601/internal/security/user_profile/_bulk_get -d "$bulk_body" |
  jq -r '.[0].data.avatar.initials // "none"')
check "profile bulk get through project-b reads cluster B" "$bulk_initials" "$es_initials"
check "project-b session rejected by project-a" "$(me_status a "$jar")" 401
# Rejected by the cookie's tenant before any session index lookup, so the cookie isn't cleared.
cleared=$(kbn a -b "$jar" -D - -o /dev/null localhost:5601/internal/security/me | grep -ci '^set-cookie')
check "project-a leaves project-b's cookie alone" "$cleared" 0

# Logout is a browser navigation: AJAX headers like kbn-xsrf make it answer 400 instead of redirecting.
logout=$(curl -s -b "$jar" -o /dev/null -w '%{http_code}' -H 'x-elastic-project-id: project-b' \
  localhost:5601/api/security/logout)
check "logout through project-b" "$logout" 302
check "logout removes the session from cluster B" "$(sessions b)" 0
check "session rejected after logout" "$(me_status b "$jar")" 401

# 10 parallel logins per tenant. Each tenant must end up with exactly its own 10 sessions.
seq 30 | xargs -P 12 -n 1 bash -c 'login "$(printf abc | cut -c$(($1 % 3 + 1)))" /dev/null >/dev/null' _
for p in a b c; do
  check "parallel logins stored in project-$p" "$(sessions "$p")" 10
done

exit "$failed"
