# OAS Validation Merge & Refactor Strategy for Kibana

## Purpose
This document provides guidance for merging and refactoring changes to the OAS validation logic in Kibana, especially when integrating modular enhancements with upstream changes (e.g., CI baseline enforcement). It is intended for maintainers and contributors working on `kbn-validate-oas` or related CLI tooling.

---

## Value Analysis: Modular Enhancements vs. Upstream PR

**Upstream PR (e.g., #232463):**
- Introduced CI checks to compare OAS error counts against a baseline, failing CI if the error count increases.
- Improved error reporting and baseline management in the OAS validation CLI.

**Your Modular Work:**
- Modularized validation logic and CLI commands for reusability and testability.
- Added robust CLI mode detection (legacy vs. enhanced), flag validation, and actionable error handling.
- Improved user experience with better help output and migration guidance.
- Maintained backward compatibility while enabling future enhancements.

**Conclusion:**
- The modular approach adds significant value: extensibility, maintainability, and a better foundation for future features.

---

## Step-by-Step Merge & Refactor Strategy

1. **Understand the Conflicts**
   - Open conflicted files (e.g., `index.ts`).
   - Identify which code comes from upstream and which from your branch.

2. **Compare the Logic**
   - Upstream: Baseline error count logic, CI exit codes, CLI changes.
   - Yours: Modular CLI, enhanced/legacy mode, flag handling, exports.

3. **Plan the Merge**
   - **Keep:**
     - All modular exports and CLI structure from your branch.
     - Baseline error count logic and CI enforcement from upstream.
   - **Refactor:**
     - Integrate baseline error count check into the enhanced CLI mode.
     - Ensure legacy CLI path remains functional.
     - Centralize error reporting and baseline logic to avoid duplication.

4. **Manual Merge**
   - For each conflict block, combine logic (not just lines).
   - Refactor or rename functions if there are naming clashes.
   - Test both CLI modes and ensure all features work.

5. **Test Thoroughly**
   - Run both CLI modes:
     - `node scripts/validate_oas_docs.js`
     - `node scripts/validate_oas_docs.js enhanced --format json`
   - Check that:
     - Baseline error count logic works (CI fails on increase).
     - Enhanced features (formats, incremental, etc.) work.
     - Legacy CLI is still backward compatible.

6. **Document and Commit**
   - Commit merged code with a clear message.
   - Update CLI help output and documentation as needed.

---

## References
- Your modular `index.ts`
- Upstream PR (e.g., #232463)
- Kibana `.github/rebase-conflict-resolution-guide.md`

---

**Tip:** For line-by-line help, paste specific conflict blocks and request targeted refactor guidance.
