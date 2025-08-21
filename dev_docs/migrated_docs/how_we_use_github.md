---
id: kibGitHub
slug: /kibana-dev-docs/contributing/github
title: How we use Github
description: Forking, branching, committing and using labels in the Kibana GitHub repo
date: 2025-08-21
tags: ['contributor', 'dev', 'github', 'getting started', 'onboarding', 'kibana']
---

Complete guide to Kibana's GitHub workflow, branching strategy, and collaborative development practices.

## Repository Setup

### Forking Strategy

Kibana follows the **[GitHub forking model](https://help.github.com/articles/fork-a-repo/)** for all contributions:

```bash
# 1. Fork kibana repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/kibana.git
cd kibana

# 3. Add upstream remote
git remote add upstream https://github.com/elastic/kibana.git

# 4. Verify remotes
git remote -v
# origin    https://github.com/YOUR_USERNAME/kibana.git (fetch)
# origin    https://github.com/YOUR_USERNAME/kibana.git (push)
# upstream  https://github.com/elastic/kibana.git (fetch)
# upstream  https://github.com/elastic/kibana.git (push)
```

### Keeping Fork Synchronized

```bash
# Regular sync workflow
git checkout main
git fetch upstream
git rebase upstream/main
git push origin main
```

## Branching Strategy

### Release Branching Model

Kibana synchronizes releases with the entire Elastic Stack using a **time-based release strategy**:

```
main              8.16.0-dev → 8.17.0-dev → 8.18.0-dev
├── 8.15          8.15.0 → 8.15.1 → 8.15.2 (patch releases)
├── 8.14          8.14.0 → 8.14.1 → 8.14.2 (patch releases) 
└── 8.13          8.13.0 → 8.13.1 → 8.13.2 (maintenance only)
```

**Branch Lifecycle:**
- **`main`**: Next minor version development (e.g., 8.16.0-dev)
- **`8.15`**: Current release branch (patch releases)
- **`8.14`**: Previous minor (security patches only)

**Version Verification:**
```bash
# Check current version
cat package.json | grep '"version"'
# "version": "8.16.0"

# Check branch versions
git show upstream/main:package.json | grep version
git show upstream/8.15:package.json | grep version
```

### Development Workflow

**Creating Feature Branches:**
```bash
# Sync with latest main
git checkout main
git fetch upstream
git rebase upstream/main

# Create feature branch
git checkout -b feature/my-awesome-feature

# Work on your changes
git add .
git commit -m "feat: implement awesome feature"

# Push to your fork
git push origin feature/my-awesome-feature
```

**Branch Naming Conventions:**
- `feature/description` - New features
- `fix/issue-description` - Bug fixes  
- `docs/topic` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/coverage-area` - Test improvements

## Commit Guidelines

### Interactive Rebase for Clean History

```bash
# Before submitting PR, clean up commit history
git rebase -i HEAD~3  # Last 3 commits

# Example rebase todo list:
# pick abc1234 Add initial feature implementation
# squash def5678 Fix typo in feature
# squash ghi9012 Update tests for feature
```

**Commit Message Standards:**
```bash
# Format: type(scope): description
feat(data-views): add field formatting options
fix(dashboard): resolve panel resize issue
docs(dev-guide): update plugin architecture examples
test(search): add integration tests for filters
refactor(core): simplify service initialization

# Breaking changes
feat(saved-objects)!: remove deprecated legacy format
```

### Email Configuration for Elastic Employees

> [!IMPORTANT]
> **Elastic employees must use `@elastic.co` email addresses** for all commits to pass CI validation.

```bash
# Configure repository-specific email
git config user.email your.name@elastic.co

# Create qualifying commit
git commit -m 'chore: update email configuration' --allow-empty
git push origin your-branch

# Verify email in GitHub settings
# Add @elastic.co email at: https://github.com/settings/emails
```

**Email Validation Error Fix:**
```bash
# If CI fails due to email validation:
git config user.email YOUR_NAME@elastic.co
git commit --amend --reset-author
git push --force-with-lease origin your-branch
```

## Conflict Resolution and Rebasing

### Safe Rebase Workflow

**Step 1: Sync Main Branch**
```bash
git checkout main
git fetch upstream
git rebase upstream/main
git push origin main  # Update your fork
```

**Step 2: Rebase Feature Branch**
```bash
git checkout feature/my-feature
git rebase main
```

**Step 3: Resolve Conflicts**
```bash
# If conflicts occur:
git status  # Shows conflicted files

# Edit conflicted files, resolve conflicts
# Look for conflict markers: <<<<<<<, =======, >>>>>>>

# Stage resolved files
git add resolved-file.ts

# Continue rebase
git rebase --continue
```

**Step 4: Force Push (Safely)**
```bash
# Use --force-with-lease for safety
git push --force-with-lease origin feature/my-feature
```

> [!WARNING]
> **Never use `git pull` after a rebase.** Always use `--force-with-lease` when pushing rebased branches.

### Advanced Conflict Resolution

**Three-way Merge Tool:**
```bash
# Configure merge tool
git config merge.tool vimdiff  # or your preferred tool

# Use merge tool for conflicts
git mergetool
```

**Understanding Conflict Context:**
```bash
# Show conflict context
git show HEAD~1  # Your changes
git show main    # Upstream changes

# Show merge base
git merge-base feature/my-feature main
```

## Backporting Strategy

### Backport Guidelines

**When to Backport:**
- ✅ **Bug fixes**: Safe, targeted fixes with test coverage
- ✅ **Security patches**: Critical security vulnerabilities
- ✅ **Documentation**: Updates that improve user experience
- ❌ **Features**: New functionality stays on `main`
- ❌ **Breaking changes**: Only allowed with 18-month deprecation

**Backport Labels:**
```bash
# Automatic backporting
backport:prev-minor     # Previous minor version (8.14)
backport:prev-major     # Previous major versions (7.17)  
backport:current-major  # All current major versions
backport:all-open       # All supported versions

# Manual control
backport:skip          # Don't backport
backport:version       # Backport to specific versions (add version labels)
```

### Manual Backport Process

```bash
# Cherry-pick to release branch
git checkout 8.15
git fetch upstream
git rebase upstream/8.15

# Cherry-pick commit
git cherry-pick abc1234

# Resolve conflicts if needed
git add .
git cherry-pick --continue

# Push backport
git push upstream 8.15

# Create backport PR if needed
gh pr create --title "Backport: original PR title" --base 8.15
```

## GitHub Labels and Issue Management

### Label Categories

**Team Organization:**
```
Team:Security          # Security team ownership
Team:Operations        # Platform operations
Team:AppArch          # Application architecture
Team:Docs             # Documentation team
```

**Feature Areas:**
```
Feature:Dashboard     # Dashboard functionality
Feature:Discover      # Discover application  
Feature:Lens          # Lens visualization
Feature:Security      # Security features
Feature:Observability # O11y features
```

**Project Coordination:**
```
Project:RuntimeFields    # Cross-team initiatives
Project:DataViews       # Major feature projects
NeededFor:APM          # Dependencies for teams
NeededFor:Security     # Security team dependencies
```

### Release Notes Labels

**Impact Classification:**
```bash
release_note:breaking      # Breaking changes (major section)
release_note:deprecation   # Deprecation notices
release_note:feature       # New features
release_note:enhancement   # Feature improvements
release_note:fix          # Bug fixes
release_note:skip         # Omit from release notes
release_note:plugin_api_changes  # Plugin API changes
```

**PR Template with Labels:**
```markdown
## Type of Change
- [ ] Bug fix (`release_note:fix`)
- [ ] Feature (`release_note:feature`) 
- [ ] Enhancement (`release_note:enhancement`)
- [ ] Breaking change (`release_note:breaking`)
- [ ] Skip release notes (`release_note:skip`)

## Backporting
- [ ] `backport:prev-minor` - Backport to 8.14
- [ ] `backport:skip` - No backporting needed
```

### Issue Workflow Labels

**Triage and Status:**
```
triage-needed     # Needs team investigation
needs_team        # Missing team assignment (auto-applied)
blocked          # Blocked by external dependency
blocker          # Blocks next release
```

**Work Types:**
```
bug              # Unexpected behavior
enhancement      # Feature request
docs             # Documentation work
meta             # Project tracking issue
discuss          # Discussion topic
```

### Advanced Label Usage

**Dependency Tracking:**
```bash
# Example: APM needs App Services team work
Labels: NeededFor:APM + Team:AppServices

# Search dependencies for roadmap planning
is:issue label:NeededFor:APM is:open

# Filter by priority
is:issue label:NeededFor:APM label:priority:high
```

**Version Management:**
```bash
# Track version-specific work
is:issue label:v8.15.0 is:open

# Release planning
is:pr label:v8.15.0 is:merged

# Bug tracking
is:issue label:bug label:v8.14.1
```

## Pull Request Workflow

### PR Creation Checklist

**Before Creating PR:**
- [ ] Interactive rebase completed
- [ ] All tests pass locally
- [ ] Commit messages follow conventions
- [ ] Branch synced with latest main
- [ ] Documentation updated if needed

**PR Template:**
```markdown
## Summary
Brief description of changes and motivation.

## Checklist
- [ ] Any text added follows [EUI guidelines](https://elastic.github.io/eui/)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios

## Release Notes
<!-- Describe user-facing changes for release notes -->
```

### Review Process

**Review Assignment:**
- Team labels automatically assign reviewers
- CODEOWNERS file ensures domain expert review
- Security-sensitive changes require security team review

**Review Guidelines:**
```bash
# Request specific reviewers
gh pr create --reviewer @elastic/kibana-security

# Self-review checklist
- Code follows style guidelines
- Tests cover edge cases  
- Security implications considered
- Performance impact assessed
- Documentation updated
```

### Merging and Squashing

**Automatic Squashing:**
All PRs are automatically squashed into a single commit when merged, with:
- Combined commit message from all commits
- PR title as the primary commit message
- PR body as extended description

**Merge Requirements:**
- All CI checks pass
- Required reviews approved
- No blocking labels
- Up-to-date with target branch

## Automation and CI Integration

### Automated Backporting

```yaml
# .backportrc.json configuration
{
  "upstream": "elastic/kibana",
  "branches": [
    { "name": "8.15", "range": "8.15.0" },
    { "name": "8.14", "range": "8.14.0" }
  ],
  "labels": {
    "backport:prev-minor": ["8.15"],
    "backport:all-open": ["8.15", "8.14"]
  }
}
```

### CI Pipeline Integration

**Required Checks:**
- TypeScript compilation
- ESLint validation
- Unit test coverage
- Functional test suite
- Bundle size analysis
- Security scanning

**Label-Triggered Actions:**
```bash
ci:deploy-cloud     # Deploy to cloud for testing
ci:skip-tests       # Skip specific test suites (emergency use)
ci:run-docs-build   # Trigger documentation build
```

## Best Practices Summary

### Development Workflow

1. **Always work on forks** - Never push directly to upstream
2. **Keep branches small** - Focus on single features or fixes
3. **Rebase frequently** - Stay current with main branch
4. **Write clear commits** - Future developers will thank you
5. **Test thoroughly** - Both automated and manual testing

### Collaboration

1. **Use descriptive labels** - Help with discoverability and routing
2. **Tag relevant teams** - Ensure proper review and ownership
3. **Document breaking changes** - Provide migration guidance
4. **Consider backport impact** - Safe changes only for stable branches

### Quality Assurance

1. **Follow commit conventions** - Enables automated tooling
2. **Include comprehensive tests** - Prevent regressions
3. **Update documentation** - Keep docs current with code changes
4. **Review security implications** - Consider attack vectors and data exposure

This workflow ensures high code quality, efficient collaboration, and stable releases across the entire Elastic Stack ecosystem.