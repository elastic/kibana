#!/bin/bash
# kbn-verify.sh — Scoped Kibana verification for hermes verify
# Auto-detects changed files from git diff and runs type_check + eslint
# only on the affected packages, not the entire repo.
#
# Usage:
#   ./scripts/kbn-verify.sh                    # auto-detect from git diff
#   ./scripts/kbn-verify.sh --filter x-pack/platform/packages/shared/kbn-evals
#
# Designed to be used as the "test" phase in .hermes/environment.json:
#   "test": ["bash scripts/kbn-verify.sh"]

set -euo pipefail

SOURCE_NVM="${HOME}/.nvm/nvm.sh"
if [ -f "$SOURCE_NVM" ]; then
  source "$SOURCE_NVM" 2>/dev/null
  NODE_VERSION="$(cat .node-version 2>/dev/null || echo '24.14.1')"
  nvm use "$NODE_VERSION" 2>/dev/null || true
fi

# Collect changed files from git diff (staged + unstaged + committed vs main)
CHANGED_FILES=""
if [ "${1:-}" = "--filter" ] && [ -n "${2:-}" ]; then
  # Explicit filter mode
  FILTER="$2"
  echo "🔍 Explicit filter: $FILTER"
  if node scripts/type_check.js "$FILTER" 2>&1; then
    echo "✅ type_check passed for $FILTER"
  else
    echo "❌ type_check failed for $FILTER"
    exit 1
  fi
  # Find changed .ts files within the filter path
  CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep '\.ts$' | grep "$FILTER" || true)
  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null | grep '\.ts$' | grep "$FILTER" || true)
  fi
else
  # Auto-detect: get all changed .ts/.js files from working tree + last few commits
  # Try: unstaged → staged → last commit → last 5 commits vs origin/main
  CHANGED_FILES=$(git diff --name-only 2>/dev/null | grep -E '\.(ts|js)$' || true)
  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|js)$' || true)
  fi
  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --name-only HEAD~5..HEAD 2>/dev/null | grep -E '\.(ts|js)$' || true)
  fi
  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null | grep -E '\.(ts|js)$' || true)
  fi
  if [ -z "$CHANGED_FILES" ]; then
    echo "ℹ️  No changed .ts/.js files detected — running full type_check"
    if node scripts/type_check.js 2>&1; then
      echo "✅ type_check passed"
    else
      echo "❌ type_check failed"
      exit 1
    fi
    exit 0
  fi

  # Derive unique packages from changed file paths
  # Pattern: x-pack/<area>/<scope>/packages/<pkg-name>/...
  PACKAGES=$(echo "$CHANGED_FILES" | \
    grep -oE 'x-pack/[^/]+/[^/]+/packages/[^/]+' | \
    sort -u || true)

  if [ -n "$PACKAGES" ]; then
    echo "🔍 Changed packages:"
    echo "$PACKAGES" | sed 's/^/  /'

    # Run type_check on each changed package
    FAILED=0
    for PKG in $PACKAGES; do
      echo "  → type_check: $PKG"
      if node scripts/type_check.js "$PKG" 2>&1; then
        echo "  ✅ $PKG"
      else
        echo "  ❌ $PKG"
        FAILED=1
      fi
    done

    if [ $FAILED -ne 0 ]; then
      echo "❌ type_check failed for one or more packages"
      exit 1
    fi
    echo "✅ type_check passed for all changed packages"
  else
    # Changed files not under a package — run full type_check
    echo "ℹ️  Changed files outside package structure — running full type_check"
    if node scripts/type_check.js 2>&1; then
      echo "✅ type_check passed"
    else
      echo "❌ type_check failed"
      exit 1
    fi
  fi
fi

# Run ESLint on changed files only (never whole-repo)
if [ -n "$CHANGED_FILES" ]; then
  # Filter to .ts files that exist
  ESLINT_FILES=""
  for F in $CHANGED_FILES; do
    if [ -f "$F" ] && echo "$F" | grep -qE '\.ts$'; then
      ESLINT_FILES="$ESLINT_FILES $F"
    fi
  done

  if [ -n "$ESLINT_FILES" ]; then
    echo "🔍 ESLint on changed files:"
    echo "$ESLINT_FILES" | tr ' ' '\n' | sed 's/^/  /'
    if node scripts/eslint $ESLINT_FILES --no-fix 2>&1; then
      echo "✅ ESLint passed"
    else
      echo "❌ ESLint failed"
      exit 1
    fi
  fi
fi

# Run JS syntax check on any changed .js files
JS_FILES=$(echo "$CHANGED_FILES" | grep '\.js$' || true)
if [ -n "$JS_FILES" ]; then
  for F in $JS_FILES; do
    if [ -f "$F" ]; then
      echo "🔍 JS syntax: $F"
      if node -c "$F" 2>&1; then
        echo "  ✅ $F"
      else
        echo "  ❌ $F"
        exit 1
      fi
    fi
  done
fi

echo ""
echo "========================================="
echo "VERIFICATION SUMMARY"
echo "========================================="
echo "type_check: ✅ (scoped to changed packages)"
echo "ESLint:     ✅ (scoped to changed files)"
echo "JS syntax:  ✅ (changed .js files only)"
echo "========================================="
echo "ALL GATES PASSED ✅"
