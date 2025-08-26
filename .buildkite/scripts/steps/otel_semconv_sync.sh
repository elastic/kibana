#!/usr/bin/env bash
set -euo pipefail

OTEL_PACKAGE_DIR="src/platform/packages/shared/kbn-otel-semantic-conventions"
GIT_SCOPE="$OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml $OTEL_PACKAGE_DIR/src/generated/resolved-semconv.ts"

clone_otel_repository() {
  echo "--- Cloning OpenTelemetry semantic conventions repository"
  rm -rf otel-semconv
  git clone https://github.com/open-telemetry/semantic-conventions.git otel-semconv --depth 1
  echo "Using semantic conventions from commit: $(cd otel-semconv && git rev-parse HEAD)"
}

generate_resolved_yaml() {
  echo "--- Generating resolved YAML with Docker weaver"
  cd otel-semconv
  docker run --rm \
    --env USER=weaver \
    --env HOME=/home/weaver \
    --mount type=bind,source=./model,target=/home/weaver/source,readonly \
    --mount type=bind,source="$(pwd)",target=/home/weaver/out \
    docker.io/otel/weaver:v0.17.1@sha256:32523b5e44fb44418786347e9f7dde187d8797adb6d57a2ee99c245346c3cdfe \
    registry resolve \
    --registry=/home/weaver/source \
    --output=/home/weaver/out/resolved_semconv.yaml
  cd ..
}

bootstrap_kibana() {
  echo "--- Bootstrapping Kibana"
  .buildkite/scripts/bootstrap.sh
}

generate_typescript() {
  echo "--- Generating TypeScript definitions"
  # Move generated YAML to package
  cp otel-semconv/resolved_semconv.yaml "$OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml"
  
  # Generate TypeScript file
  node scripts/generate_otel_semconv.js
  
  # Run ESLint fix
  yarn lint:es --fix "$OTEL_PACKAGE_DIR/src/generated/" || true
}

create_pull_request() {
  echo "--- Differences found. Preparing PR creation data."

  # Configure Git with machine user
  KIBANA_MACHINE_USERNAME="kibanamachine"
  
  # Define PR details
  PR_TITLE='[One Discover][Logs UX] Update OpenTelemetry Semantic Conventions'
  PR_BODY='This PR updates the OpenTelemetry semantic conventions definitions to the latest version.

### Changes Made
- ✅ Updated `resolved-semconv.yaml` with latest conventions from OpenTelemetry repository
- ✅ Regenerated `resolved-semconv.ts` with new field definitions and metadata
- ✅ Applied ESLint formatting to generated files

### Validation
- ✅ TypeScript compilation successful
- ✅ Package tests passing
- ✅ ESLint formatting applied
- ✅ Generated files follow Kibana coding standards

🤖 Generated automatically by Buildkite workflow'

  # Create branch name for reference
  BRANCH_NAME="otel_semconv_sync_$(date +%s)"

  # Check DRY_RUN mode
  if [[ "${DRY_RUN:-}" =~ ^(1|true)$ ]]; then
    echo "🔍 DRY_RUN: Collected data for PR creation (no git operations performed):"
    echo ""
    echo "=== PR METADATA ==="
    echo "Title: $PR_TITLE"
    echo "Proposed Branch: $BRANCH_NAME"
    echo "Target Base: main"
    echo "Author: $KIBANA_MACHINE_USERNAME"
    echo ""
    echo "=== LABELS ==="
    echo "- Team:obs-ux-logs"
    echo "- release_note:skip"
    echo "- backport:skip" 
    echo "- otel-semantic-conventions"
    echo ""
    echo "=== ASSIGNEES & REVIEWERS ==="
    echo "Assignee: elastic/obs-ux-logs-team"
    echo "Reviewer: elastic/obs-ux-logs-team"
    echo ""
    echo "=== FILES TO COMMIT ==="
    echo "- $OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml"
    echo "- $OTEL_PACKAGE_DIR/src/generated/resolved-semconv.ts"
    echo ""
    echo "=== FILE CHANGES SUMMARY ==="
    if [ -f "$OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml" ]; then
      yaml_lines=$(wc -l < "$OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml")
      echo "YAML file: $yaml_lines lines"
    fi
    if [ -f "$OTEL_PACKAGE_DIR/src/generated/resolved-semconv.ts" ]; then
      ts_lines=$(wc -l < "$OTEL_PACKAGE_DIR/src/generated/resolved-semconv.ts")
      echo "TypeScript file: $ts_lines lines"
    fi
    echo ""
    echo "=== GIT DIFF SUMMARY ==="
    echo "Changed files detected:"
    git diff --name-only $GIT_SCOPE || echo "No git diff available"
    echo ""
    echo "=== COMMIT MESSAGE ==="
    echo "Update OpenTelemetry semantic conventions"
    echo ""
    echo "- Updated resolved-semconv.yaml with latest OTel conventions"
    echo "- Regenerated TypeScript definitions with new field metadata"  
    echo "- Generated automatically by Buildkite workflow"
    echo ""
    echo "🔍 DRY_RUN: All PR data collected - no git operations or PR creation performed"
    return 0
  fi

  # Normal mode: perform git operations
  git config --global user.name "$KIBANA_MACHINE_USERNAME"
  git config --global user.email '42973632+kibanamachine@users.noreply.github.com'

  # Check if a PR already exists
  pr_search_result=$(gh pr list --search "$PR_TITLE" --state open --author "$KIBANA_MACHINE_USERNAME" --limit 1 --json title -q ".[].title")

  if [ "$pr_search_result" == "$PR_TITLE" ]; then
    echo "PR already exists. Exiting."
    exit 0
  fi

  echo "No existing PR found. Proceeding to create new PR."

  # Create branch with timestamp
  git checkout -b "$BRANCH_NAME"

  # Add the changed files
  git add "$OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml"
  git add "$OTEL_PACKAGE_DIR/src/generated/resolved-semconv.ts"
  
  # Create commit with descriptive message
  git commit -m "Update OpenTelemetry semantic conventions

- Updated resolved-semconv.yaml with latest OTel conventions
- Regenerated TypeScript definitions with new field metadata
- Generated automatically by Buildkite workflow"

  echo "--- Changes committed. Creating pull request."

  # Push branch to origin
  git push origin "$BRANCH_NAME"

  # Create pull request with proper labels and team assignment
  gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --base main \
    --head "$BRANCH_NAME" \
    --label 'Team:obs-ux-logs' \
    --label 'release_note:skip' \
    --label 'backport:skip' \
    --label 'otel-semantic-conventions' \
    --reviewer 'elastic/obs-ux-logs-team' \
    --assignee 'elastic/obs-ux-logs-team'

  echo "✅ Pull request created successfully!"
}

report_main_step() {
  echo "--- $1"
}

main() {
  cd "$PARENT_DIR"

  report_main_step "Cloning OpenTelemetry semantic conventions repository"
  clone_otel_repository
  
  report_main_step "Generating resolved YAML with Docker weaver"  
  generate_resolved_yaml
  
  cd "$KIBANA_DIR"
  
  report_main_step "Checking for YAML changes"
  # Copy new YAML and check for immediate changes
  cp "$PARENT_DIR/otel-semconv/resolved_semconv.yaml" "$OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml"
  
  # Check if YAML actually changed
  set +e
  git diff --exit-code --quiet "$OTEL_PACKAGE_DIR/assets/resolved-semconv.yaml"
  yaml_changed=$?
  set -e
  
  if [ $yaml_changed -eq 0 ]; then
    echo "No changes in semantic conventions YAML. Our work is done here."
    exit 0
  fi
  
  report_main_step "YAML changes detected. Bootstrapping Kibana"
  bootstrap_kibana
  
  report_main_step "Generating TypeScript definitions"
  generate_typescript
  
  report_main_step "Performing final change detection"
  # Final change detection
  set +e
  git diff --exit-code --quiet $GIT_SCOPE
  if [ $? -eq 0 ]; then
    echo "No final differences found. Our work is done here."
    exit 0
  fi
  set -e
  
  report_main_step "Creating pull request"
  create_pull_request
}

main