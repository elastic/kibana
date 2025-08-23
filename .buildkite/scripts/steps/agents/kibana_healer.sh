#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Kibana Healer - Automatically fix simple CI failures using Gemini CLI
# Algorithm:
# 1. check failed steps -> early exit if not in list
# 2. setup gemini cli
# 3. iterate through failures
# 4. if passes create commit else reset changes
# 5. push changes if needed
# 6. upload logs
# 7. exit based on fix status

# Step keys that the AI agent will attempt to fix
FIXABLE_STEPS=("quick_checks")

echo "--- Checking for fixable failures"
failed_steps=()
logs_dir="/tmp/failed_step_logs"
mkdir -p "$logs_dir"

for step in "${FIXABLE_STEPS[@]}"; do
    outcome=$(buildkite-agent step get "outcome" --step "$step" 2>/dev/null || echo "unknown")
    if [[ "$outcome" == "hard_failed" ]]; then
        failed_steps+=("$step")

        # Get logs for this failed step
        echo "Collecting logs for $step..."
        download_artifact "buildkite-agent-log-$step.txt" "$logs_dir/"
    fi
done

# Early exit if no fixable failures
if [[ ${#failed_steps[@]} -eq 0 ]]; then
    echo "No failures found in fixable steps: ${FIXABLE_STEPS[*]}"
    echo "Exiting early"
    exit 0
fi

echo "Found ${#failed_steps[@]} failed steps to fix: ${failed_steps[*]}"

echo "--- Setup Gemini CLI"
GEMINI_API_KEY="$(vault_get kibana-healer gemini)"
export GEMINI_API_KEY

npm install -g @google/gemini-cli

# Start Gemini logs tail in background
gemini_logs="/tmp/gemini_healer.log"
touch "$gemini_logs"
tail -f "$gemini_logs" &
tail_pid=$!

echo "--- Process failures with Gemini"
# Track if any fixes were made
healer_fix_success=0

# Create comprehensive prompt for Gemini
failed_steps_str="${failed_steps[*]}"
PROMPT="You are a Kibana CI failure fixing agent. Your task is to automatically fix simple CI failures in the Kibana repository.

CRITICAL RULES:
- You are in a Kibana repository that has already run \`yarn kbn bootstrap\`
- Failed step logs are available in /tmp/failed_step_logs/
- Only make minimal changes to fix the specific failure
- Test fixes using the correct script from the scripts/ directory
- Never remove tests to make them pass - only fix or refactor them
- Follow Kibana development patterns and TypeScript conventions
- You are currently in /home/brad/kibana directory

WORKFLOW:
1. Read the failure logs for each step
2. Identify the root cause of the failure
3. Make minimal targeted fixes
4. Test the fix using the corresponding script
5. If test passes, commit with message \"healer fix: <step_name>\"
6. If test fails, reset changes with \`git checkout .\` and move to next failure

AVAILABLE FAILED STEPS AND THEIR TEST COMMANDS:
- quick_checks: Test with \`node scripts/quick_checks --file .buildkite/scripts/steps/checks/quick_checks.txt\`

FAILED STEPS TO PROCESS: $failed_steps_str

Log all your actions and reasoning to help with debugging.

Please start by examining the failure logs and attempting to fix each failed step."

# Run Gemini to fix the failures
echo "Starting Gemini-powered failure fixing..."
if gemini -p "$PROMPT" >> "$gemini_logs" 2>&1; then
    echo "Gemini execution completed"
else
    echo "Gemini execution had issues, but continuing..."
fi

echo "--- Push changes if any commits were made"
# Check if there are any commits with "healer fix:" pattern
if git log --oneline | head -5 | grep -q "healer fix:"; then
    echo "Found healer fix commits, pushing to branch..."

    # Use the correct branch - GITHUB_PR_BRANCH contains just the branch name
    if [[ -n "${GITHUB_PR_BRANCH:-}" ]]; then
        target_branch="$GITHUB_PR_BRANCH"
    elif [[ -n "${BUILDKITE_BRANCH:-}" ]]; then
        target_branch="$BUILDKITE_BRANCH"
    else
        target_branch="$(git branch --show-current)"
    fi

    echo "Pushing to branch: $target_branch"
    git push origin "HEAD:$target_branch"
    healer_fix_success=1
else
    echo "No healer fix commits found"
fi

echo "--- Upload Gemini logs"
# Kill the tail process
kill $tail_pid 2>/dev/null || true

# Upload only Gemini logs as artifact
buildkite-agent artifact upload "$gemini_logs"

echo "--- Exit based on fix status"
if [[ $healer_fix_success -eq 1 ]]; then
    echo "✅ Kibana Healer successfully fixed one or more failures"
    exit 0
else
    echo "❌ Kibana Healer could not fix any failures"
    exit 1
fi
