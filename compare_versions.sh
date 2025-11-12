#!/bin/bash

# Version Comparison Script for Kibana
# Usage: ./compare_versions.sh <version1> <version2>
# Example: ./compare_versions.sh v8.19.5 v8.19.7

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Function to print subsection headers
print_subheader() {
    echo ""
    echo -e "${CYAN}--- $1 ---${NC}"
    echo ""
}

# Check if two arguments are provided
if [ $# -ne 2 ]; then
    echo -e "${RED}Error: Two version tags required${NC}"
    echo "Usage: $0 <version1> <version2>"
    echo "Example: $0 v8.19.5 v8.19.7"
    exit 1
fi

VERSION1=$1
VERSION2=$2

# Verify tags exist
if ! git rev-parse "$VERSION1" >/dev/null 2>&1; then
    echo -e "${RED}Error: Tag $VERSION1 not found${NC}"
    echo "Available tags matching pattern:"
    git tag | grep "v8.19" | sort -V
    exit 1
fi

if ! git rev-parse "$VERSION2" >/dev/null 2>&1; then
    echo -e "${RED}Error: Tag $VERSION2 not found${NC}"
    echo "Available tags matching pattern:"
    git tag | grep "v8.19" | sort -V
    exit 1
fi

print_header "Comparing Kibana Versions: $VERSION1 → $VERSION2"

# 1. Basic Version Information
print_subheader "1. Version Information"
echo -e "${GREEN}First version:${NC} $VERSION1"
git log -1 --format="%H%n%ai%n%an <%ae>" "$VERSION1"
echo ""
echo -e "${GREEN}Second version:${NC} $VERSION2"
git log -1 --format="%H%n%ai%n%an <%ae>" "$VERSION2"

# 2. Commit Count
print_subheader "2. Commit Summary"
COMMIT_COUNT=$(git log --oneline "$VERSION1..$VERSION2" | wc -l)
echo -e "${GREEN}Total commits:${NC} $COMMIT_COUNT"

# 3. Recent Commits (first 30)
print_subheader "3. Recent Commits (first 30)"
git log --oneline --no-decorate "$VERSION1..$VERSION2" | head -30

# 4. File Statistics
print_subheader "4. File Change Statistics"
echo -e "${GREEN}Summary:${NC}"
git diff --shortstat "$VERSION1..$VERSION2"
echo ""
echo -e "${GREEN}Detailed statistics (top 30 files by changes):${NC}"
git diff --stat "$VERSION1..$VERSION2" | head -30

# 5. Changes by File Type
print_subheader "5. Changes by File Type"
echo -e "${GREEN}TypeScript/JavaScript files:${NC}"
git diff --stat "$VERSION1..$VERSION2" -- '*.ts' '*.tsx' '*.js' '*.jsx' | tail -1

echo -e "${GREEN}Configuration files:${NC}"
git diff --stat "$VERSION1..$VERSION2" -- '*.json' '*.yml' '*.yaml' '*.toml' | tail -1

echo -e "${GREEN}Test files:${NC}"
git diff --stat "$VERSION1..$VERSION2" -- '*.test.ts' '*.test.tsx' '*.test.js' | tail -1

echo -e "${GREEN}Documentation files:${NC}"
git diff --stat "$VERSION1..$VERSION2" -- '*.md' '*.mdx' | tail -1

# 6. Contributors
print_subheader "6. Contributors"
echo -e "${GREEN}Number of contributors:${NC}"
git log --format="%an" "$VERSION1..$VERSION2" | sort -u | wc -l
echo ""
echo -e "${GREEN}Top 10 contributors by commit count:${NC}"
git log --format="%an" "$VERSION1..$VERSION2" | sort | uniq -c | sort -rn | head -10

# 7. Changed Directories
print_subheader "7. Most Changed Directories (top 20)"
git diff --dirstat=files "$VERSION1..$VERSION2" | head -20

# 8. Binary Files
print_subheader "8. Binary Files Changed"
BINARY_COUNT=$(git diff --numstat "$VERSION1..$VERSION2" | grep "^-" | wc -l)
echo -e "${GREEN}Number of binary files changed:${NC} $BINARY_COUNT"
if [ $BINARY_COUNT -gt 0 ] && [ $BINARY_COUNT -lt 50 ]; then
    echo ""
    echo -e "${GREEN}Binary files:${NC}"
    git diff --numstat "$VERSION1..$VERSION2" | grep "^-" | awk '{print $3}' | head -20
fi

# 9. Dependency Changes
print_subheader "9. Dependency Changes"
if git diff "$VERSION1..$VERSION2" -- package.json >/dev/null 2>&1; then
    echo -e "${GREEN}Changes in root package.json:${NC}"
    git diff "$VERSION1..$VERSION2" -- package.json | grep -E "^\+|^-" | grep -E "\".*\":" | head -30
else
    echo "No changes in root package.json"
fi

# 10. Merge Commits
print_subheader "10. Merge Commits"
MERGE_COUNT=$(git log --merges --oneline "$VERSION1..$VERSION2" | wc -l)
echo -e "${GREEN}Number of merge commits:${NC} $MERGE_COUNT"
if [ $MERGE_COUNT -gt 0 ] && [ $MERGE_COUNT -lt 30 ]; then
    echo ""
    echo -e "${GREEN}Recent merge commits:${NC}"
    git log --merges --oneline "$VERSION1..$VERSION2" | head -15
fi

# 11. Tag Annotations
print_subheader "11. Tag Information"
echo -e "${GREEN}$VERSION1 tag info:${NC}"
git tag -l -n9 "$VERSION1" | head -5
echo ""
echo -e "${GREEN}$VERSION2 tag info:${NC}"
git tag -l -n9 "$VERSION2" | head -5

# 12. Useful Commands
print_header "Useful Git Commands for Further Analysis"
cat <<EOF
${GREEN}1. View full commit log:${NC}
   git log $VERSION1..$VERSION2

${GREEN}2. View commits with file changes:${NC}
   git log --stat $VERSION1..$VERSION2

${GREEN}3. View commits by specific author:${NC}
   git log --author="Author Name" $VERSION1..$VERSION2

${GREEN}4. View complete file diff:${NC}
   git diff $VERSION1..$VERSION2

${GREEN}5. View diff for specific file:${NC}
   git diff $VERSION1..$VERSION2 -- path/to/file

${GREEN}6. View changed files only:${NC}
   git diff --name-only $VERSION1..$VERSION2

${GREEN}7. View changed files with status:${NC}
   git diff --name-status $VERSION1..$VERSION2

${GREEN}8. Search commits for specific text:${NC}
   git log --grep="search term" $VERSION1..$VERSION2

${GREEN}9. View changes in specific directory:${NC}
   git diff $VERSION1..$VERSION2 -- path/to/directory/

${GREEN}10. Generate a formatted patch:${NC}
   git format-patch $VERSION1..$VERSION2

${GREEN}11. View commits touching specific file:${NC}
   git log $VERSION1..$VERSION2 -- path/to/file

${GREEN}12. Compare specific file between versions:${NC}
   git diff $VERSION1:path/to/file $VERSION2:path/to/file

${GREEN}13. Show commits between versions in reverse order:${NC}
   git log --reverse --oneline $VERSION1..$VERSION2

${GREEN}14. View detailed stats by author:${NC}
   git log --shortstat --author="Author Name" $VERSION1..$VERSION2

${GREEN}15. Generate a release notes friendly summary:${NC}
   git log --pretty=format:"- %s (%h)" $VERSION1..$VERSION2
EOF

print_header "Comparison Complete"
echo -e "${GREEN}Compared:${NC} $VERSION1 → $VERSION2"
echo -e "${GREEN}Total commits:${NC} $COMMIT_COUNT"
echo -e "${GREEN}Report generated:${NC} $(date)"
echo ""
