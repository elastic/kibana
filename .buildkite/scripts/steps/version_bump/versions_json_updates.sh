#!/usr/bin/env bash

# versions.json, .backportrc.json and pipeline resource definition updates for the version bump.
# Source-only: reads NEW_VERSION and BRANCH, edits files in the current directory.

update_patch_versions_json() {
  echo "Patch bump: updating version for branch '$BRANCH' to '$NEW_VERSION'"

  jq --arg version "$NEW_VERSION" --arg branch "$BRANCH" \
    '(.versions[] | select(.branch == $branch)).version = $version' \
    versions.json > versions.json.tmp && mv versions.json.tmp versions.json
}

# On the X.Y.1 patch bump (right after X.Y.0 ships), drop same-major release branches older than
# X.(Y-1). Until X.Y.0 ships, the n-2 minor stays in CI for possible emergency patches.
prune_superseded_minors() {
  local major minor patch
  IFS=. read -r major minor patch <<< "$NEW_VERSION"

  # X.0.1 and X.1.1 have no same-major minor older than X.(Y-1) to drop
  if [ "$patch" != "1" ] || [ "$minor" -lt 2 ]; then
    return
  fi

  echo "First patch of ${major}.${minor}: removing ${major}.x release branches older than ${major}.$((minor - 1))"

  jq --arg major "$major" --argjson minMinor "$((minor - 1))" \
    '.versions |= map(select(
      (.branchType == "release" and (.branch | startswith($major + ".")) and ((.branch | split(".")[1] | tonumber) < $minMinor)) | not
    ))' \
    versions.json > versions.json.tmp && mv versions.json.tmp versions.json
}

# Drops the same release branches as prune_superseded_minors from the branch_configuration and
# schedules of the given pipeline resource definitions. The version bump runs it on X.Y.1 only.
prune_superseded_minor_branches() {
  local major minor patch file
  IFS=. read -r major minor patch <<< "$NEW_VERSION"

  echo "Removing ${major}.x branches older than ${major}.$((minor - 1)) from pipeline resource definitions"

  for file in "$@"; do
    awk -v major="$major" -v min_minor="$((minor - 1))" -v quote="'" '
      function superseded(branch,   parts) {
        return split(branch, parts, ".") == 2 && parts[1] == major && parts[2] + 0 < min_minor
      }
      # Prints the buffered schedule entry unless it targets a superseded branch.
      function flush() {
        if (!drop) printf "%s", entry
        entry = ""
        drop = 0
      }
      match($0, /^ *branch_configuration:/) {
        flush()
        line = substr($0, 1, RLENGTH)
        count = split(substr($0, RLENGTH + 1), branches, " ")
        for (i = 1; i <= count; i++) if (!superseded(branches[i])) line = line " " branches[i]
        print line
        next
      }
      # Schedule entries are keys indented 8 spaces with their fields nested below.
      /^        [^ ]/ {
        flush()
        entry = $0 "\n"
        next
      }
      entry != "" && /^          / {
        entry = entry $0 "\n"
        if ($1 == "branch:") {
          branch = $2
          gsub(quote, "", branch)
          if (superseded(branch)) drop = 1
        }
        next
      }
      {
        flush()
        print
      }
      END { flush() }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  done
}

update_minor_versions_json() {
  local major minor next_minor

  major=$(echo "$NEW_VERSION" | cut -d. -f1)
  minor=$(echo "$NEW_VERSION" | cut -d. -f2)
  next_minor=$((minor + 1))
  # Exported so update_backportrc_json can use it
  export NEXT_DEV_VERSION="${major}.${next_minor}.0"

  echo "Minor bump: adding branch '$BRANCH' with version '$NEW_VERSION'"
  echo "Next dev version for main: $NEXT_DEV_VERSION"

  # 1. Bump main's version to the next dev version
  jq --arg nextVersion "$NEXT_DEV_VERSION" \
    '(.versions[] | select(.branch == "main")).version = $nextVersion' \
    versions.json > versions.json.tmp && mv versions.json.tmp versions.json

  # 2. Insert a new release entry for the new branch (after main), skipping if already present
  if jq -e --arg branch "$BRANCH" '.versions[] | select(.branch == $branch)' versions.json > /dev/null 2>&1; then
    echo "Branch '$BRANCH' already present in versions.json — skipping insert"
  else
    jq --arg version "$NEW_VERSION" --arg branch "$BRANCH" \
      '.versions |= [.[0]] + [{"version": $version, "branch": $branch, "branchType": "release"}] + .[1:]' \
      versions.json > versions.json.tmp && mv versions.json.tmp versions.json
  fi
}

update_backportrc_json() {
  # 1. Add the new branch to targetBranchChoices right after "main", skipping if already present
  if jq -e --arg branch "$BRANCH" '.targetBranchChoices | index($branch)' .backportrc.json > /dev/null 2>&1; then
    echo "Branch '$BRANCH' already present in targetBranchChoices — skipping insert"
  else
    jq --arg branch "$BRANCH" \
      '.targetBranchChoices |= [.[0]] + [$branch] + .[1:]' \
      .backportrc.json > .backportrc.json.tmp && mv .backportrc.json.tmp .backportrc.json
  fi

  # 2. Update branchLabelMapping: replace the old main version pattern with the next dev version
  #    Match the key that maps to "main" and looks like "^v9.4.0$" (not the generic regex pattern)
  jq --arg nextVersion "$NEXT_DEV_VERSION" \
    '.branchLabelMapping |= with_entries(
      if .value == "main" and (.key | startswith("^v")) and (.key | endswith("$")) and (.key | contains("(") | not)
      then .key = ("^v" + $nextVersion + "$")
      else .
      end
    )' \
    .backportrc.json > .backportrc.json.tmp && mv .backportrc.json.tmp .backportrc.json
}
