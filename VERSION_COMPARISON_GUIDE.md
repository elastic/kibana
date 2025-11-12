# Kibana Version Comparison Guide

This guide demonstrates how to compare changes between different versions of Kibana (specifically between v8.19.5 and v8.19.7).

## Quick Summary

**Versions Compared:** v8.19.5 → v8.19.7

- **Total Commits:** 261
- **Files Changed:** 1,652 files
- **Insertions:** 26,071 lines
- **Deletions:** 9,968 lines
- **Contributors:** 72 unique contributors
- **Date Range:** October 3, 2025 to November 7, 2025

## Methods Used to Compare Versions

### Method 1: Using the Comparison Script

The simplest way to compare versions is to use the provided comparison script:

```bash
./compare_versions.sh v8.19.5 v8.19.7
```

This script provides a comprehensive comparison including:
- Commit summary
- File change statistics
- Changes by file type
- Contributor statistics
- Directory changes
- Dependency updates
- And more...

### Method 2: Basic Git Commands

#### View All Commits Between Versions

```bash
# View commits in one-line format
git log --oneline v8.19.5..v8.19.7

# View detailed commits
git log v8.19.5..v8.19.7

# View commits with file statistics
git log --stat v8.19.5..v8.19.7

# View commits with patch diffs
git log -p v8.19.5..v8.19.7
```

#### View File Changes

```bash
# Summary of changes
git diff --stat v8.19.5..v8.19.7

# Short statistics
git diff --shortstat v8.19.5..v8.19.7

# List of changed files only
git diff --name-only v8.19.5..v8.19.7

# List with change status (Added, Modified, Deleted)
git diff --name-status v8.19.5..v8.19.7

# Full diff
git diff v8.19.5..v8.19.7
```

#### Count Changes

```bash
# Count number of commits
git log --oneline v8.19.5..v8.19.7 | wc -l

# Count number of files changed
git diff --name-only v8.19.5..v8.19.7 | wc -l
```

### Method 3: GitHub Web Interface

You can also view the comparison on GitHub:

```
https://github.com/elastic/kibana/compare/v8.19.5...v8.19.7
```

This provides:
- Visual diff viewer
- Commit history
- File changes with syntax highlighting
- Comments and discussions
- Pull request references

### Method 4: Specific Analysis Commands

#### By File Type

```bash
# TypeScript/JavaScript changes
git diff --stat v8.19.5..v8.19.7 -- '*.ts' '*.tsx' '*.js' '*.jsx'

# Test file changes
git diff --stat v8.19.5..v8.19.7 -- '*.test.ts' '*.test.tsx' '*.test.js'

# Configuration changes
git diff --stat v8.19.5..v8.19.7 -- '*.json' '*.yml' '*.yaml'

# Documentation changes
git diff --stat v8.19.5..v8.19.7 -- '*.md' '*.mdx'
```

#### By Directory

```bash
# Security solution changes
git log --oneline v8.19.5..v8.19.7 -- x-pack/solutions/security/

# Observability changes
git log --oneline v8.19.5..v8.19.7 -- x-pack/solutions/observability/

# Fleet plugin changes
git log --oneline v8.19.5..v8.19.7 -- x-pack/platform/plugins/private/fleet/
```

#### By Author

```bash
# List all contributors
git log --format="%an" v8.19.5..v8.19.7 | sort -u

# Commits by specific author
git log --author="Kibana Machine" v8.19.5..v8.19.7

# Stats by author
git log --author="Kibana Machine" --shortstat v8.19.5..v8.19.7
```

#### By Keywords

```bash
# Search commit messages
git log --grep="Security" v8.19.5..v8.19.7

# Search for backports
git log --grep="8.19" v8.19.5..v8.19.7

# Case-insensitive search
git log --grep="fleet" --regexp-ignore-case v8.19.5..v8.19.7
```

### Method 5: Advanced Analysis

#### Directory Statistics

```bash
# Show which directories were most changed
git diff --dirstat=files v8.19.5..v8.19.7

# With percentage threshold
git diff --dirstat=files,5 v8.19.5..v8.19.7
```

#### Merge Commits

```bash
# List merge commits
git log --merges --oneline v8.19.5..v8.19.7

# Count merge commits
git log --merges --oneline v8.19.5..v8.19.7 | wc -l
```

#### Binary Files

```bash
# List binary files changed
git diff --numstat v8.19.5..v8.19.7 | grep "^-"

# Show binary files with details
git diff --binary v8.19.5..v8.19.7
```

#### Specific File Comparison

```bash
# Compare a specific file between versions
git diff v8.19.5..v8.19.7 -- package.json

# Show file at specific version
git show v8.19.5:package.json
git show v8.19.7:package.json

# See all commits that touched a file
git log v8.19.5..v8.19.7 -- package.json
```

### Method 6: Generate Reports

#### Release Notes Format

```bash
# Generate release notes style list
git log --pretty=format:"- %s (%h)" v8.19.5..v8.19.7 > release_notes.txt

# With PR numbers
git log --oneline v8.19.5..v8.19.7 | grep "#" > prs_included.txt
```

#### Patch Files

```bash
# Generate patch files for all commits
git format-patch v8.19.5..v8.19.7

# Generate single patch file
git diff v8.19.5..v8.19.7 > version_diff.patch
```

#### HTML Report

```bash
# Generate HTML log
git log --pretty=format:'<li>%h - %s (%an)</li>' v8.19.5..v8.19.7 > log.html
```

## Key Findings from v8.19.5 to v8.19.7

### Major Changes

1. **TypeScript/JavaScript Files:** 1,507 files changed (22,167 insertions, 7,555 deletions)
2. **Test Files:** 317 files changed (11,119 insertions, 2,294 deletions)
3. **Configuration Files:** 100 files changed (684 insertions, 357 deletions)
4. **Documentation Files:** 8 files changed (849 insertions, 378 deletions)

### Top Contributors

1. Kibana Machine - 105 commits
2. elastic-renovate-prod[bot] - 22 commits
3. elastic-vault-github-plugin-prod[bot] - 9 commits
4. Dzmitry Lemechko - 8 commits
5. Brad White - 8 commits

### Notable Dependency Updates

- `yaml` package updated to 2.8.1
- `nodemailer` updated from 6.9.15 to 7.0.9
- `puppeteer` updated from 24.17.0 to 24.24.0
- `pdfmake` updated from 0.2.15 to 0.2.20
- `@moonrepo/cli` updated from 1.40.1 to 1.41.5

### Areas Most Changed

- Security Solution plugins and tests
- Fleet management
- Response Operations packages
- Observability features
- Discovery and UI components

## Useful Tips

### Performance

For large repositories like Kibana, some commands can be slow. Here are some optimization tips:

```bash
# Limit output size
git log --oneline v8.19.5..v8.19.7 | head -50

# Focus on specific paths
git diff --stat v8.19.5..v8.19.7 -- x-pack/

# Use abbreviated commits
git log --abbrev-commit --oneline v8.19.5..v8.19.7
```

### Filtering

```bash
# Exclude files/directories
git diff v8.19.5..v8.19.7 -- . ':(exclude)node_modules'

# Only include specific patterns
git diff v8.19.5..v8.19.7 -- '*.ts' '*.tsx'

# Date range filtering
git log --since="2025-10-01" --until="2025-11-01" v8.19.5..v8.19.7
```

### Export Options

```bash
# Export to file
git log v8.19.5..v8.19.7 > changelog.txt

# With specific format
git log --pretty=format:"%h - %an, %ar : %s" v8.19.5..v8.19.7 > detailed_log.txt

# Statistics to CSV
git log --pretty=format:"%h,%an,%ae,%ad,%s" --date=short v8.19.5..v8.19.7 > commits.csv
```

## Additional Resources

- **Git Documentation:** https://git-scm.com/docs
- **Kibana Repository:** https://github.com/elastic/kibana
- **Kibana Release Notes:** https://www.elastic.co/guide/en/kibana/current/release-notes.html

## Conclusion

This guide demonstrates multiple methods to compare Kibana versions. The provided `compare_versions.sh` script offers the most comprehensive automated comparison, while individual git commands provide flexibility for specific analysis needs.

For any version comparison in the repository, you can use:

```bash
./compare_versions.sh <version1> <version2>
```

Or explore using the various git commands shown above based on your specific needs.
