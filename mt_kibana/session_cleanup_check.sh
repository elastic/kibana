#!/usr/bin/env bash
# Checks that the session cleanup task removes expired sessions from a tenant's cluster.
# Start Kibana with --xpack.security.session.lifespan=30s --xpack.security.session.cleanupInterval=10s first.
set -uo pipefail

user=mt_user
pass=mt-session-pass

hash=$(node -e "process.stdout.write(require('crypto').createHash('sha3-256').update('$user').digest('hex'))")
since=$(node -e 'process.stdout.write(String(Date.now()))')
query="{\"query\":{\"bool\":{\"filter\":[{\"term\":{\"usernameHash\":\"$hash\"}},{\"range\":{\"createdAt\":{\"gte\":$since}}}]}}}"
sessions() {
  curl -s -o /dev/null -u kibana_system:changeme-b -X POST localhost:9201/.kibana_security_session/_refresh
  curl -s -u kibana_system:changeme-b -H 'content-type: application/json' \
    localhost:9201/.kibana_security_session/_count -d "$query" | jq -r '.count // 0'
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

curl -s -o /dev/null -u elastic:changeme-b -H 'content-type: application/json' \
  -X PUT "localhost:9201/_security/user/$user" -d "{\"password\":\"$pass\",\"roles\":[\"superuser\"]}"
login=$(curl -s -o /dev/null -w '%{http_code}' -H 'x-elastic-project-id: project-b' -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana' -H 'content-type: application/json' \
  -X POST localhost:5601/internal/security/login \
  -d "{\"providerType\":\"basic\",\"providerName\":\"basic\",\"currentURL\":\"http://localhost:5601/login\",\"params\":{\"username\":\"$user\",\"password\":\"$pass\"}}")
check "login through project-b" "$login" 200
check "session stored in cluster B" "$(sessions)" 1

echo "waiting 60s for the session to expire and the cleanup task to run..."
sleep 60
check "expired session removed from cluster B" "$(sessions)" 0

exit "$failed"
