#!/usr/bin/env bash

# Sourced by the Security Labs pipeline steps that call the Contentstack Content Delivery API.
# Exports SECURITY_LABS_CONTENTSTACK_API_KEY and SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN from
# Vault and registers both with the Buildkite log redactor. Leaves them unset when the secret
# can't be read, so each caller decides whether that is fatal.

if [[ -z "${SECURITY_LABS_CONTENTSTACK_API_KEY:-}" || -z "${SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN:-}" ]]; then
  if [[ "$(type -t vault_get)" != "function" ]]; then
    source .buildkite/scripts/common/vault_fns.sh
  fi

  SECURITY_LABS_CONTENTSTACK_API_KEY="$(vault_get security-labs-contentstack api_key || true)"
  SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN="$(vault_get security-labs-contentstack delivery_token || true)"

  if [[ -n "$SECURITY_LABS_CONTENTSTACK_API_KEY" && -n "$SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN" ]]; then
    buildkite-agent redactor add <<<"$SECURITY_LABS_CONTENTSTACK_API_KEY" 2>/dev/null || true
    buildkite-agent redactor add <<<"$SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN" 2>/dev/null || true
    export SECURITY_LABS_CONTENTSTACK_API_KEY
    export SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN
  else
    unset SECURITY_LABS_CONTENTSTACK_API_KEY SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN
    echo "Could not read the Security Labs Contentstack credentials from Vault" >&2
  fi
fi
