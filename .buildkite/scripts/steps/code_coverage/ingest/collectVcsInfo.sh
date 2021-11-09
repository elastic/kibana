#!/usr/bin/env bash

set -euo pipefail

echo "### Prok'd Index File: ..."
cat src/dev/code_coverage/www/index.html

predicate() {
  x=$1
  if [ -n "$x" ]; then
    return
  else
    echo "### 1 or more variables that Code Coverage needs, are undefined"
    exit 1
  fi
}
CMD="git log --pretty=format"
XS=("${GIT_BRANCH}" \
  "$(${CMD}":%h" -1)" \
  "$(${CMD}":%an" -1)" \
  "$(${CMD}":%s" -1)")
touch VCS_INFO.txt
for X in "${!XS[@]}"; do
  {
    predicate "${XS[X]}"
    echo "${XS[X]}" >> VCS_INFO.txt
  }
done
echo "### VCS_INFO:"
cat VCS_INFO.txt