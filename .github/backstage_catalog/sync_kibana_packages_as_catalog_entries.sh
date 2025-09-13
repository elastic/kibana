#!/usr/bin/env bash

set -euo pipefail

cd catalog-info

# Set up git

git config user.name "github-actions[bot]"

git config user.email "kibana-bot+github-actions[bot]@users.noreply.github.com"

# Allow overriding from environment; default to bulk-update branch
: "${BRANCH:=backstage/kibana/bulk-update}"

git fetch origin "$BRANCH" || true

if git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
git checkout -B "$BRANCH" "origin/$BRANCH"
else
git checkout -B "$BRANCH"
fi

mkdir -p locations/kibana

# write all component files and build expected list using jq
slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+|-+$//g'; }

: "${MATRIX:?MATRIX JSON is required}"
: > /tmp/expected.txt
: > /tmp/slugmap.txt

# Go over the matrix and create/update files with Catalog Info for all Kibana packages in the matrix
echo "$MATRIX" | jq -c '.include[]' | while read -r item; do
  id=$(jq -r '.id' <<<"$item")
  title=$(jq -r '.title // empty' <<<"$item"); [ -z "$title" ] && title="$(slug "$id")"
  desc=$(jq -r '.description // ""' <<<"$item")
  owner=$(jq -r 'if (.owner|type=="array") then (.owner|join(", ")) else (.owner // "unknown") end' <<<"$item")
  folder=$(jq -r '.folder // ""' <<<"$item")
  type=$(jq -r '.type // "package"' <<<"$item")
  s=$(slug "$id")
  name="kibana-$s"

  cat > "locations/kibana/${name}.yml" <<YAML
# yaml-language-server: $schema=https://json.schemastore.org/catalog-info.json
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${name}
  title: ${title}
  description: ${desc}
  tags:
    - kibana
    - ${type}
  links:
    - url: ${folder}
      title: Source (elastic/kibana)
      icon: github
spec:
  type: ${type}
  lifecycle: production
  owner: ${owner}
  subcomponentOf: kibana
YAML

  echo "$name" >> /tmp/expected.txt
  printf '%s\t%s\n' "$s" "$id" >> /tmp/slugmap.txt
done

sort -u /tmp/expected.txt -o /tmp/expected.txt

cd locations/kibana


# Remove files that are not in the list of Kibana packages. These catalog entries represent packages that no longer exist in Kibana.

CHANGED=0

for f in kibana-*.yml; do
[ -e "$f" ] || continue
    base="${f%.yml}"

if ! grep -xq "$base" /tmp/expected.txt; then
    echo "Pruning orphan $f"
    rm -f "$f"
    CHANGED=1
fi

done

cd ../..

if ! git diff --quiet; then
  CHANGED=1
fi

git add -A

# Build markdown table of changes from staged diff
if ! git diff --cached --quiet -- locations/kibana; then
  {
    echo "## Changes in Kibana packages"
    echo
    echo "| package | change |"
    echo "|---|---|"
    git diff --cached --name-status -- locations/kibana \
      | awk '$2 ~ /locations\/kibana\/kibana-.*\.yml$/ {print $1"\t"$2}' \
      | while IFS=$'\t' read -r status path; do
          base=$(basename "$path")
          base_noext="${base%.yml}"
          slug="${base_noext#kibana-}"
          id=$(awk -v s="$slug" -F '\t' '$1==s{print $2}' /tmp/slugmap.txt | head -n1)
          [ -z "$id" ] && id="$slug"
          case "$status" in
            A) change="add" ;;
            M) change="update" ;;
            D) change="remove" ;;
            *) change="$status" ;;
          esac
          echo "| $id | $change |"
        done
  } > /tmp/bulk_changes.md
fi

if [ "$CHANGED" -eq 1 ]; then
  # commit and push
  git commit -m "Bulk sync Kibana components"
  git push -u origin "$BRANCH"
else
  echo "No changes in bulk sync"
fi
