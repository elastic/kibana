#!/bin/bash
set -euo pipefail

usage() {
  cat <<'EOF'
Submit Developer Experience (DevEx) feedback to help improve Kibana's docs, tooling, workflows, prompts, and skills.

Usage:
  scripts/devex_feedback.sh --message "..." [options]
  echo "..." | scripts/devex_feedback.sh [options]
  scripts/devex_feedback.sh "..." [options]

Options:
  -m, --message <text>       Feedback message (required unless stdin is piped)
      --base-url <url>       Defaults to $CI_STATS_BASE_URL or https://ci-stats.kibana.dev
      --dry-run              Print request JSON and exit
  -h, --help                 Show help

Environment:
  CI_STATS_BASE_URL          Override base url (default: https://ci-stats.kibana.dev)
EOF
}

base_url="${CI_STATS_BASE_URL:-https://ci-stats.kibana.dev}"
message=''
dry_run='false'

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m | --message)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Option $1 requires a value" >&2
        usage >&2
        exit 1
      fi

      message="$2"
      shift 2
      ;;
    --base-url)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Option $1 requires a value" >&2
        usage >&2
        exit 1
      fi

      base_url="$2"
      shift 2
      ;;
    --dry-run)
      dry_run='true'
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

# Accept the message from flags, remaining args, or stdin (in that order).
if [[ -z "$message" ]]; then
  if [[ $# -gt 0 ]]; then
    message="$*"
  elif [[ ! -t 0 ]]; then
    message="$(cat)"
  fi
fi

if [[ -z "$message" ]]; then
  usage >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
git_branch="$(git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
git_commit="$(git -C "$repo_root" rev-parse HEAD 2>/dev/null || true)"
kibana_uuid=''
if [[ -f "$repo_root/data/uuid" ]]; then
  kibana_uuid="$(cat "$repo_root/data/uuid" | tr -d '\n\r')"
fi
host_name="$(hostname 2>/dev/null || true)"

payload="$(
  # Use Node for JSON encoding to avoid shell escaping edge cases.
  MESSAGE="$message" \
    REPO_ROOT="$repo_root" \
    GIT_BRANCH="$git_branch" \
    GIT_COMMIT="$git_commit" \
    KIBANA_UUID="$kibana_uuid" \
    HOST_NAME="$host_name" \
    node - <<'NODE'
const message = process.env.MESSAGE ?? '';

const meta = {
  source: 'scripts/devex_feedback.sh',
  repoRoot: process.env.REPO_ROOT || undefined,
  gitBranch: process.env.GIT_BRANCH || undefined,
  gitCommit: process.env.GIT_COMMIT || undefined,
  kibanaUuid: process.env.KIBANA_UUID || undefined,
  hostname: process.env.HOST_NAME || undefined,
};

for (const [key, value] of Object.entries(meta)) {
  if (value === undefined || value === '') {
    delete meta[key];
  }
}

const body = {
  message,
  meta,
};

process.stdout.write(JSON.stringify(body));
NODE
)"

if [[ "$dry_run" == 'true' ]]; then
  echo "$payload"
  exit 0
fi

if [[ "${CODEX_SANDBOX_NETWORK_DISABLED:-}" == '1' ]]; then
  # Codex disables outbound network in its sandbox. Still allow --dry-run for debugging.
  echo 'Refusing to submit: CODEX_SANDBOX_NETWORK_DISABLED=1 (network is disabled in Codex sandbox).' >&2
  echo 'Run outside the sandbox, or ask Codex to rerun with network approval.' >&2
  exit 2
fi

endpoint="${base_url%/}/v1/feedback"

curl_args=(
  -sS
  -X POST
  -H 'content-type: application/json'
  --max-time 30
  --data-binary "$payload"
)

# Capture body + status to fail reliably on non-2xx while still showing server errors.
response="$(curl "${curl_args[@]}" -w $'\n%{http_code}' "$endpoint")"
http_status="${response##*$'\n'}"
response_body="${response%$'\n'*}"

if [[ ! "$http_status" =~ ^[0-9]{3}$ ]]; then
  echo 'Unexpected HTTP status from curl' >&2
  exit 1
fi

if [[ "$http_status" =~ ^2[0-9]{2}$ ]]; then
  echo 'Submitted, thanks!'
  exit 0
fi

printf '%s\n' "$response_body" >&2
echo "Request failed with HTTP $http_status" >&2
exit 1
