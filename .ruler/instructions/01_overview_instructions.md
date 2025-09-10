# Kibana Development Guide for Coding Agents

## Trust These Instructions

These instructions are based on comprehensive repository analysis and current CI pipeline configuration. Only search for additional information if these instructions are incomplete or found to be incorrect for your specific use case. The build system is complex but well-documented - following this guide will save significant exploration time.

## Repository Overview

Kibana is a browser-based analytics and search dashboard for Elasticsearch, consisting of approximately 74,000 TypeScript/JavaScript files spanning 1.7GB. This is a large, complex monorepo with strict build requirements and extensive CI validation.

**Key Technologies:**
- **Runtime:** Node.js (exact version required, check `.nvmrc` and `.node-version`)
- **Package Manager:** Yarn ^1.22.19 (Yarn 2.0+ not supported)
- **Primary Languages:** TypeScript, JavaScript (React for frontend)
- **Architecture:** Microservice plugin architecture with shared core platform

## Branch Management & Version Control

### Active Branches
The repository maintains multiple active branches defined in `versions.json` in the root directory. This file changes frequently and contains:
- Current major/minor versions (e.g., 9.2.0 on main, 9.1.x, 9.0.x)
- Previous major versions (e.g., 8.19.x, 8.18.x, 8.17.x)
- Legacy versions (e.g., 7.17.x)

**CRITICAL:** Always validate that your current branch aligns with your assigned task. Tasks may target specific version branches, not just `main`.

```bash
# Check current branch and available versions
git branch -a
cat versions.json
```

### Backporting Process
Backporting commits from `main` to release branches is handled by the `backport` tool:

```bash
# Backport a commit interactively (recommended)
yarn backport

# Backport specific commits to specific branches
yarn backport --sha <commit-sha> --branch 8.19 --branch 9.1
```

The `.backportrc.json` configuration defines:
- Target branch choices (matches `versions.json`)
- Auto-merge settings (enabled with squash method)
- PR description templates with commit tracking

**Backport Workflow:**
1. Merge your changes to `main` first
2. Run `yarn backport` to select commits and target branches
3. Monitor process and resolve any merge conflicts manually
4. Tool automatically creates backport PRs with proper labels

## Development Documentation (`dev_docs/`)
For detailed information beyond these instructions, refer to the comprehensive development documentation in `dev_docs/`:

**Essential Areas:**
- **Getting Started**: Environment setup, troubleshooting
- **Contributing**: Best practices, development principles, documentation guidelines, API design standards
- **Key Concepts**: Plugin architecture, saved objects, data views, embeddables, performance optimization, security patterns
- **Tutorials**: Testing strategies, debugging techniques, plugin development, performance testing, API versioning
- **Operations**: Package management (IDM), flaky test handling, CI optimization, test stability guidelines

**Critical Development Concepts:**
- **Saved Objects**: Kibana's primary data persistence mechanism - essential for most plugin development
- **Plugin vs Package Decision**: Use `dev_docs/key_concepts/kibana_platform_plugin_intro.mdx` to determine code placement
- **Performance**: Always consider bundle size, lazy loading, and scalability (see `dev_docs/key_concepts/performance/`)
- **Accessibility**: Follow EUI accessibility standards for all UI components
- **Security**: Implement proper privilege models and input validation

### force CI failure