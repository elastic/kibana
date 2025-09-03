#!/usr/bin/env bash

set -euo pipefail

# Expect values via environment variables provided by the workflow step
# Required: ID
# Optional with defaults: TITLE, DESC, OWNER, FOLDER, TYPE
: "${ID:?ID is required}"
: "${TITLE:=}"
: "${DESC:=}"
: "${OWNER:=unknown}"
: "${FOLDER:=}"
: "${TYPE:=package}"

# Create a safe slug for filenames and Backstage metadata.name
SLUG_ID=$(printf '%s' "$ID" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+|-+$//g')
NAME="kibana-${SLUG_ID}"
BRANCH="backstage/kibana/${ID}"

cd catalog-info
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git fetch origin "$BRANCH" || true

if git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
git checkout -B "$BRANCH" "origin/$BRANCH"
else
git checkout -B "$BRANCH"
fi

mkdir -p locations/kibana

FILE="locations/kibana/${NAME}.yml"

cat > "$FILE" <<YAML
# yaml-language-server: $schema=https://json.schemastore.org/catalog-info.json
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${NAME}
  title: ${TITLE}
  description: ${DESC}
  tags:
    - kibana
    - ${TYPE}
  links:
    - url: ${FOLDER}
      title: Source (elastic/kibana)
      icon: github
spec:
  type: ${TYPE}
  lifecycle: production
  owner: ${OWNER}
  subcomponentOf: kibana
YAML

git add -A
git commit -m "Add ${NAME} to Backstage catalog" || echo "Nothing to commit"
git push -u origin "$BRANCH"