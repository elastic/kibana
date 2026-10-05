#!/usr/bin/env bash

# Point `localhost` at the IPv6 loopback for the whole agent, so that every client going
# through the OS resolver (Node, Elasticsearch, curl) reaches `::1` and nothing can quietly
# fall back to IPv4.
#
# This does not cover Chrome. It treats `localhost` as a special name per RFC 6761 and answers
# it internally with both loopback addresses instead of looking it up, so /etc/hosts never
# enters into it and the browser could still reach Kibana over 127.0.0.1. The FTR/Scout
# launchers pin it to `::1` with --host-resolver-rules when KIBANA_TEST_IPV6_ONLY is set.
#
# Keeping the hostname `localhost` matters beyond convenience: browsers only grant a secure
# context to `localhost`, `*.localhost` and the loopback IP literals, and the dev certificates
# in kbn-dev-utils only carry a `DNS:localhost` SAN. A distinct name such as `ip6-localhost`
# loses both, and every `hostname === 'localhost'` check in the codebase stops matching.

# Every address `localhost` resolves to, deduplicated onto one line. `getent ahosts` repeats each
# address once per socket type, which is noise for a log line.
localhost_addresses() {
  local addresses
  addresses=$(getent ahosts localhost 2>/dev/null |
    awk '!seen[$1]++ { printf "%s%s", separator, $1; separator = " " }')
  echo "${addresses:-<unresolved>}"
}

log_localhost_resolution() {
  echo "$1: $(localhost_addresses)"
}

# `ahosts` goes through getaddrinfo, the same resolution the clients this mode covers use. `hosts`
# would answer from gethostbyname2, which returns a single family and reports `::1` even where
# `localhost` still carries an IPv4 address. The whole address set is compared, not just the
# first entry: a dual-stack answer that prefers IPv6 still leaves 127.0.0.1 reachable.
resolves_only_to_ipv6_loopback() {
  [[ "$(localhost_addresses)" == "::1" ]]
}

if [[ "${AGENT_LOOPBACK_IPV6_ONLY:-}" == "true" ]]; then
  if resolves_only_to_ipv6_loopback; then
    echo "--- localhost already resolves only to the IPv6 loopback"
  elif ! sudo -n true 2>/dev/null; then
    # Dispatch and artifact-upload jobs run on unprivileged k8s pods and never talk to a
    # Kibana or Elasticsearch server, so they have nothing to reach over the loopback.
    echo "--- Skipping IPv6-only loopback setup, /etc/hosts is not writable on this agent"
  else
    echo "--- Resolving localhost to the IPv6 loopback"

    log_localhost_resolution "localhost resolved to (before)"

    hosts_ipv6_only=$(mktemp)

    awk '
      # Drop localhost aliases from IPv4 loopback entries, removing lines left with no names.
      $1 ~ /^127\./ {
        entry = $1
        names = 0
        for (i = 2; i <= NF; i++) {
          if ($i != "localhost" && $i != "localhost.localdomain") {
            entry = entry " " $i
            names++
          }
        }
        if (names > 0) print entry
        next
      }
      # Debian and Ubuntu ship `::1 ip6-localhost ip6-loopback`, without `localhost`.
      $1 == "::1" {
        seen_ipv6_loopback = 1
        for (i = 2; i <= NF; i++) {
          if ($i == "localhost") { print; next }
        }
        print $0 " localhost"
        next
      }
      { print }
      END { if (!seen_ipv6_loopback) print "::1 localhost ip6-localhost ip6-loopback" }
    ' /etc/hosts >"$hosts_ipv6_only"

    sudo cp /etc/hosts /etc/hosts.ipv4.bak
    sudo cp "$hosts_ipv6_only" /etc/hosts
    rm -f "$hosts_ipv6_only"

    log_localhost_resolution "localhost resolves to (after)"

    # Anything else still answering for localhost would let clients reach the loopback over IPv4
    # and report a pass without having exercised IPv6.
    if ! resolves_only_to_ipv6_loopback; then
      echo "localhost does not resolve only to ::1 after rewriting /etc/hosts:"
      cat /etc/hosts
      exit 1
    fi
  fi
elif [[ "${KIBANA_TEST_IPV6_ONLY:-}" == "true" ]]; then
  # The two are set together or the run is only half IPv6: the browser would be pinned to ::1
  # while everything on the OS resolver still reaches the loopback over IPv4, which reports as
  # a pass without having tested anything.
  echo "^^^ +++"
  echo "KIBANA_TEST_IPV6_ONLY is set without AGENT_LOOPBACK_IPV6_ONLY, so only the browser"
  echo "will use the IPv6 loopback. Set AGENT_LOOPBACK_IPV6_ONLY=true to cover the rest."
fi
