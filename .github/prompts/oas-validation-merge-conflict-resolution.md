<!--
Prompt Name: oas-validation-merge-conflict-resolution.md
Purpose: Guide the user (and Copilot) through resolving OAS validation merge conflicts in Kibana, following the modular merge strategy.
-->

# OAS Validation Merge Conflict Resolution Prompt

## Instructions
You WILL follow this step-by-step process to resolve merge conflicts in OAS validation logic for Kibana, ensuring both modular enhancements and upstream CI baseline logic are integrated. You WILL use imperative language and reference the strategy in `.github/oas-validation-merge-strategy.md`.

---

## Step-by-Step Merge & Refactor Process

1. **Identify Conflicted Files**
   - You WILL open all files with merge conflicts related to OAS validation (e.g., `index.ts`, CLI entrypoints, helpers).
   - You WILL clearly distinguish between upstream (main) changes and modular branch changes in each conflict block.

2. **Analyze and Compare Logic**
   - You WILL document which logic comes from upstream (e.g., CI baseline error count, exit codes, CLI changes) and which from the modular branch (e.g., CLI mode detection, modular exports, enhanced/legacy handling).
   - You WILL summarize the unique value of each side before merging.

3. **Plan the Merge**
   - You WILL keep all modular CLI structure and exports from the modular branch.
   - You WILL integrate baseline error count and CI enforcement logic from upstream into the enhanced CLI mode.
   - You WILL ensure the legacy CLI path remains functional and backward compatible.
   - You WILL centralize error reporting and baseline logic to avoid duplication.

4. **Manual Merge and Refactor**
   - For each conflict block, you WILL combine logic, not just lines.
   - You WILL refactor or rename functions to resolve naming clashes.
   - You WILL ensure both CLI modes (legacy and enhanced) are fully functional.

5. **Test Both CLI Modes**
   - You WILL run:
     - `node scripts/validate_oas_docs.js`
     - `node scripts/validate_oas_docs.js enhanced --format json`
   - You WILL verify:
     - Baseline error count logic works (CI fails on increase)
     - Enhanced features (formats, incremental, etc.) work
     - Legacy CLI is still backward compatible

6. **Document and Commit**
   - You WILL commit merged code with a clear message summarizing the merge and refactor.
   - You WILL update CLI help output and documentation as needed.

---

## Success Criteria
- Both CLI modes work as intended
- Baseline error count logic is enforced in CI
- Modular CLI structure and exports are preserved
- No duplicated or conflicting logic remains
- Documentation is updated

---

## References
- `.github/oas-validation-merge-strategy.md`
- Upstream PR (e.g., #232463)
- Kibana `.github/rebase-conflict-resolution-guide.md`

---

**Tip:** For line-by-line help, paste specific conflict blocks and request targeted refactor guidance.
