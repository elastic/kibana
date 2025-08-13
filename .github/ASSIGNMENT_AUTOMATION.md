# Assignment Automation Enhancement

This documents the enhanced assignment automation system implemented to reduce manual issue and PR assignment work.

## Overview

The "Copilot assign shadow issue" has been resolved by implementing a comprehensive automated assignment system that acts as a "copilot" to help with project and team assignments.

## What Changed

### 1. Enhanced Project Assignment (`project-assigner.yml`)

**Before:** Only 4 Feature labels were automatically assigned to projects:
- `Feature:Canvas` → Project 38
- `Feature:Dashboard` → Project 68  
- `Feature:Drilldowns` → Project 68
- `Feature:Input Controls` → Project 72

**After:** Added 2 additional Feature labels from `paths-labeller.yml`:
- `Feature:Embedding` → Project 68
- `Feature:ExpressionLanguage` → Project 68

### 2. New Team Assignment Copilot (`team-assignment-copilot.yml`)

Created a new "shadow" workflow that provides intelligent assignment assistance:

**Auto-assignment guidance:**
- Detects when new issues lack team/feature labels
- Posts helpful comments explaining available labels
- Provides clear guidance for manual assignment

**Team label recognition:**
- Recognizes team labels: `Team:obs-ux-infra_services`, `Team:obs-ux-management`, `Team:Obs AI Assistant`, `Team:Fleet`
- Provides framework for future team-based auto-assignment
- Logs team assignments for tracking

## Benefits

1. **Reduced Manual Work**: More labels now trigger automatic project assignment
2. **Better Guidance**: New issues get helpful assignment guidance automatically
3. **Team Awareness**: Team labels are recognized and can trigger notifications
4. **Scalable Framework**: Easy to add new label→project mappings
5. **Non-intrusive**: Provides help without being spammy

## Future Enhancements

The system is designed to be easily extensible:

1. **Add more project mappings** by editing the `issue-mappings` in `project-assigner.yml`
2. **Enable team notifications** by uncommenting team assignment logic in `team-assignment-copilot.yml`
3. **Add path-based assignment** for PRs based on changed files (using CODEOWNERS)

## Usage

The system automatically activates when:
- Issues are opened/labeled/unlabeled
- Pull requests are opened/labeled/unlabeled

No manual intervention required - it works as a "copilot" assistant!