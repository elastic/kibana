#!/bin/bash

# Renaming script for onechat → agent_builder/agentBuilder
# Usage: ./rename.sh [--step 1|2|3]
#   --step 1: File/folder renaming
#   --step 2: String replacement (sed patterns + convert to agentBuilder)
#   --step 3: Run ESLint to fix issues
#   --step 4: run build
#   --step 5: run validation
#   No --step: Run all steps

set -e

# Parse arguments
STEP=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --step)
      STEP="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./rename.sh [--step 1|2|3|4|5]"
      exit 1
      ;;
  esac
done

echo "=================================================="
echo "Context-Aware Rename: agent_builder → agent_builder/agentBuilder"
if [ -n "$STEP" ]; then
  echo "Running step $STEP only"
fi
echo "=================================================="

# =============================================================================
# STEP 1: File/folder renaming
# =============================================================================
if [ -z "$STEP" ] || [ "$STEP" = "1" ]; then
  echo ""
  echo "Step 1: Renaming folders and files..."

  # Main plugin folder
  if [ -d "x-pack/platform/plugins/shared/onechat" ]; then
    if [ -d "x-pack/platform/plugins/shared/agent_builder" ]; then
      echo "Removing leftover directory: x-pack/platform/plugins/shared/agent_builder"
      git rm -rf "x-pack/platform/plugins/shared/agent_builder" 2>/dev/null || rm -rf "x-pack/platform/plugins/shared/agent_builder"
    fi
    echo "Renaming x-pack/platform/plugins/shared/onechat → agent_builder"
    git mv "x-pack/platform/plugins/shared/onechat" "x-pack/platform/plugins/shared/agent_builder"
  fi

  # Package folder and subfolders
  # First rename subfolders (while parent still has old name), then rename parent
  if [ -d "x-pack/platform/packages/shared/onechat" ]; then
    PACKAGE_DIR="x-pack/platform/packages/shared/onechat"
    NEW_PACKAGE_DIR="x-pack/platform/packages/shared/agent_builder"

    # Package subfolders (all use hyphens) - rename while parent still has old name
    if [ -d "$PACKAGE_DIR/onechat-server" ]; then
      if [ -d "$PACKAGE_DIR/agent-builder-server" ]; then
        echo "Removing leftover directory: $PACKAGE_DIR/agent-builder-server"
        git rm -rf "$PACKAGE_DIR/agent-builder-server" 2>/dev/null || rm -rf "$PACKAGE_DIR/agent-builder-server"
      fi
      echo "Renaming onechat-server → agent-builder-server"
      git mv "$PACKAGE_DIR/onechat-server" "$PACKAGE_DIR/agent-builder-server"
    fi

    if [ -d "$PACKAGE_DIR/onechat-common" ]; then
      if [ -d "$PACKAGE_DIR/agent-builder-common" ]; then
        echo "Removing leftover directory: $PACKAGE_DIR/agent-builder-common"
        git rm -rf "$PACKAGE_DIR/agent-builder-common" 2>/dev/null || rm -rf "$PACKAGE_DIR/agent-builder-common"
      fi
      echo "Renaming onechat-common → agent-builder-common"
      git mv "$PACKAGE_DIR/onechat-common" "$PACKAGE_DIR/agent-builder-common"
    fi

    if [ -d "$PACKAGE_DIR/onechat-browser" ]; then
      if [ -d "$PACKAGE_DIR/agent-builder-browser" ]; then
        echo "Removing leftover directory: $PACKAGE_DIR/agent-builder-browser"
        git rm -rf "$PACKAGE_DIR/agent-builder-browser" 2>/dev/null || rm -rf "$PACKAGE_DIR/agent-builder-browser"
      fi
      echo "Renaming onechat-browser → agent-builder-browser"
      git mv "$PACKAGE_DIR/onechat-browser" "$PACKAGE_DIR/agent-builder-browser"
    fi

    if [ -d "$PACKAGE_DIR/onechat-genai-utils" ]; then
      if [ -d "$PACKAGE_DIR/agent-builder-genai-utils" ]; then
        echo "Removing leftover directory: $PACKAGE_DIR/agent-builder-genai-utils"
        git rm -rf "$PACKAGE_DIR/agent-builder-genai-utils" 2>/dev/null || rm -rf "$PACKAGE_DIR/agent-builder-genai-utils"
      fi
      echo "Renaming onechat-genai-utils → agent-builder-genai-utils"
      git mv "$PACKAGE_DIR/onechat-genai-utils" "$PACKAGE_DIR/agent-builder-genai-utils"
    fi

    if [ -d "$PACKAGE_DIR/kbn-evals-suite-onechat" ]; then
      if [ -d "$PACKAGE_DIR/kbn-evals-suite-agent-builder" ]; then
        echo "Removing leftover directory: $PACKAGE_DIR/kbn-evals-suite-agent-builder"
        git rm -rf "$PACKAGE_DIR/kbn-evals-suite-agent-builder" 2>/dev/null || rm -rf "$PACKAGE_DIR/kbn-evals-suite-agent-builder"
      fi
      echo "Renaming kbn-evals-suite-onechatr → kbn-evals-suite-agent-builder"
      git mv "$PACKAGE_DIR/kbn-evals-suite-onechat" "$PACKAGE_DIR/kbn-evals-suite-agent-builder"
    fi

    # Now rename the parent folder
    if [ -d "x-pack/platform/packages/shared/onechat" ]; then
      echo "Removing leftover directory: x-pack/platform/packages/shared/agent-builder"
      git rm -rf "x-pack/platform/packages/shared/agent-builder" 2>/dev/null || rm -rf "x-pack/platform/packages/shared/agent-builder"
    fi
    echo "Renaming x-pack/platform/packages/shared/onechat → agent-builder"
    git mv "$PACKAGE_DIR" "x-pack/platform/packages/shared/agent-builder"
  fi

  # Test folders (use underscores)
  if [ -d "x-pack/platform/test/onechat_functional" ]; then
    if [ -d "x-pack/platform/test/agent_builder_functional" ]; then
      echo "Removing leftover directory: x-pack/platform/test/agent_builder_functional"
      git rm -rf "x-pack/platform/test/agent_builder_functional" 2>/dev/null || rm -rf "x-pack/platform/test/agent_builder_functional"
    fi
    echo "Renaming x-pack/platform/test/onechat_functional → agent_builder_functional"
    git mv "x-pack/platform/test/onechat_functional" "x-pack/platform/test/agent_builder_functional"
  fi

  if [ -d "x-pack/platform/test/onechat_api_integration" ]; then
    if [ -d "x-pack/platform/test/agent_builder_api_integration" ]; then
      echo "Removing leftover directory: x-pack/platform/test/agent_builder_api_integration"
      git rm -rf "x-pack/platform/test/agent_builder_api_integration" 2>/dev/null || rm -rf "x-pack/platform/test/agent_builder_api_integration"
    fi
    echo "Renaming x-pack/platform/test/onechat_api_integration → agent_builder_api_integration"
    git mv "x-pack/platform/test/onechat_api_integration" "x-pack/platform/test/agent_builder_api_integration"
  fi

  if [ -d "x-pack/platform/test/onechat" ]; then
    if [ -d "x-pack/platform/test/agent_builder" ]; then
      echo "Removing leftover directory: x-pack/platform/test/agent_builder"
      git rm -rf "x-pack/platform/test/agent_builder" 2>/dev/null || rm -rf "x-pack/platform/test/agent_builder"
    fi
    echo "Renaming x-pack/platform/test/onechat → agent_builder"
    git mv "x-pack/platform/test/onechat" "x-pack/platform/test/agent_builder"
  fi

  # Other folders
  if [ -d "src/platform/plugins/shared/dashboard/server/onechat" ]; then
    if [ -d "src/platform/plugins/shared/dashboard/server/agent_builder" ]; then
      echo "Removing leftover directory: src/platform/plugins/shared/dashboard/server/agent_builder"
      git rm -rf "src/platform/plugins/shared/dashboard/server/agent_builder" 2>/dev/null || rm -rf "src/platform/plugins/shared/dashboard/server/agent_builder"
    fi
    echo "Renaming src/platform/plugins/shared/dashboard/server/onechat → agent_builder"
    git mv "src/platform/plugins/shared/dashboard/server/onechat" "src/platform/plugins/shared/dashboard/server/agent_builder"
  fi

  echo "All folder renames completed!"

  echo ""
  echo "Renaming files containing 'onechat' in their names..."

  # Find and rename files containing "onechat" or "one_chat" in their filename
  # Use git mv to preserve Git history
  rg --files \
    -g '!node_modules/*' \
    -g '!.git/*' \
    -g '!target/*' \
    -g '!build/*' \
    -g '!.cache/*' \
    -g '!dist/*' \
    -g '!coverage/*' \
    -g '!.yarn/*' \
    -g '!tmp/*' \
    -g '!rename.sh' | grep -iE 'onechat|one_chat' | while read -r file; do
    # Get directory and filename
    dir=$(dirname "$file")
    filename=$(basename "$file")

    # Determine new filename based on naming convention
    # Replace onechat- with agent-builder- (hyphens)
    new_filename=$(echo "$filename" | sed 's/onechat-/agent-builder-/g')
    # Replace -onechat with -agent-builder (hyphens)
    new_filename=$(echo "$new_filename" | sed 's/-onechat/-agent-builder/g')
    # Replace onechat_ with agent_builder_ (underscores)
    new_filename=$(echo "$new_filename" | sed 's/onechat_/agent_builder_/g')
    # Replace _onechat with _agent_builder (underscores)
    new_filename=$(echo "$new_filename" | sed 's/_onechat/_agent_builder/g')
    # Replace one_chat with agent_builder (underscores)
    new_filename=$(echo "$new_filename" | sed 's/one_chat/agent_builder/g')
    # Replace standalone onechat with agent_builder (underscores)
    new_filename=$(echo "$new_filename" | sed 's/^onechat$/agent_builder/g')
    new_filename=$(echo "$new_filename" | sed 's/^onechat\./agent_builder./g')

    # Only rename if the filename actually changed
    if [ "$filename" != "$new_filename" ]; then
      new_file="$dir/$new_filename"
      # Check if file is tracked by Git, skip if not
      if ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        echo "Skipping untracked file: $file"
        continue
      fi
      # Check if target file already exists
      if [ -f "$new_file" ]; then
        echo "Removing leftover file: $new_file"
        git rm -f "$new_file" 2>/dev/null || rm -f "$new_file"
      fi
      echo "Renaming file: $file → $new_file"
      git mv "$file" "$new_file"
    fi
  done

  echo "All file renames completed!"

  # Commit after step 1 if running all steps
  if [ -z "$STEP" ]; then
    echo "Committing step 1 changes..."
    git add -A
    git commit -m "Rename: Step 1 - File and folder renaming"
  fi
fi

# =============================================================================
# STEP 2: String replacement
# =============================================================================
if [ -z "$STEP" ] || [ "$STEP" = "2" ]; then
  echo ""
  echo "Step 2: Applying string replacements..."

  # Find all files once and apply all replacements in a single pass
  # This is much faster than running find multiple times
  echo "Finding files and applying all replacements..."
  rg -0 -i -l --hidden 'onechat|one_chat' \
    -g '!node_modules/*' \
    -g '!.git/*' \
    -g '!target/*' \
    -g '!build/*' \
    -g '!.cache/*' \
    -g '!dist/*' \
    -g '!coverage/*' \
    -g '!.yarn/*' \
    -g '!tmp/*' \
    -g '!rename.sh' 2>/dev/null |
  xargs -0 sed -i '' \
    -e 's/onechat-/agent-builder-/g' \
    -e 's/-onechat/-agent-builder/g' \
    -e 's/_onechat/_agent_builder/g' \
    -e 's/onechat_/agent_builder_/g' \
    -e 's/OneChat/AgentBuilder/g' \
    -e 's/oneChat/agentBuilder/g' \
    -e 's/ONECHAT/AGENTBUILDER/g' \
    -e 's/one_chat/agent_builder/g' \
    -e 's/ONE_CHAT/AGENT_BUILDER/g' \
    -e 's/packages\/shared\/onechat/packages\/shared\/agent-builder/g' \
    -e 's/plugins\/shared\/onechat/plugins\/shared\/agent_builder/g' \
    -e 's/\/onechat/\/agent_builder/g' \
    -e 's/onechat\//agent_builder\//g' \
    -e 's/Onechat/AgentBuilder/g' \
    -e 's/onechat/agentBuilder/g' || true

  rg -i -l 'onechat' -g '!rename.sh' || echo "No remaining onechat references found"

  echo "All text replacements completed!"

  # Commit after step 2 if running all steps
  if [ -z "$STEP" ]; then
    echo "Committing step 2 changes..."
    git add -A
    git commit -m "Rename: Step 2 - String replacements"
  fi
fi


# =============================================================================
# STEP 3: Run ESLint to fix issues
# =============================================================================
if [ -z "$STEP" ] || [ "$STEP" = "3" ]; then
  echo ""
  echo "Step 3: Running ESLint to fix issues..."

  yarn kbn bootstrap
  node scripts/eslint_all_files --fix

  echo "ESLint complete."

  # Commit after step 3 if running all steps
  if [ -z "$STEP" ]; then
    echo "Committing step 3 changes..."
    git add -A
    git commit -m "Rename: Step 3 - ESLint fixes"
  fi
fi

if [ -z "$STEP" ] || [ "$STEP" = "4" ]; then
  echo ""
  echo "Step 4: building various things..."
  node scripts/build_plugin_list_docs
  node scripts/generate codeowners
  node scripts/build_kibana_platform_plugins.js --update-limits
  node scripts/yarn_deduplicate.js && yarn kbn bootstrap

  # Commit after step 4 if running all steps
  if [ -z "$STEP" ]; then
    echo "Committing step 4 changes..."
    git add -A
    git commit -m "Rename: Step 4 - Build artifacts"
  fi
fi

# =============================================================================
# Verification
# =============================================================================
echo ""
echo "Verification: Checking for remaining occurrences..."

remaining=$(rg -l -i --hidden 'onechat|one_chat' \
  -g '!node_modules/*' \
  -g '!.git/*' \
  -g '!target/*' \
  -g '!build/*' \
  -g '!.cache/*' \
  -g '!dist/*' \
  -g '!coverage/*' \
  -g '!.yarn/*' \
  -g '!tmp/*' \
  -g '!rename.sh' \
  -g '!rename.claude.sh' \
  -g '!rename.claude.py' 2>/dev/null || true)

if [ -n "$remaining" ]; then
  echo "WARNING: Files still contain 'onechat':"
  echo "$remaining" | head -20
else
  echo "SUCCESS: No remaining 'onechat' occurrences found."
fi

echo ""
echo "=================================================="
echo "Done!"
echo "=================================================="
