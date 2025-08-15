# Rebase Conflict Resolution Guide for Kibana

## Overview

This guide provides a step-by-step process for resolving rebase conflicts in the Kibana repository, with a focus on the `kbn-validate-oas` package. It is designed to help you keep both your changes and the latest updates from the `main` branch, following Kibana's best practices and workflow.

---

### 1. **Understand the Conflict**
- Git will mark conflicts in files (like `index.ts`) with `<<<<<<<`, `=======`, and `>>>>>>>`.
- Everything between `<<<<<<< HEAD` and `=======` is from `main`.
- Everything between `=======` and `>>>>>>> your-branch` is your change.

---

### 2. **Resolve the Conflict**
- Open each conflicted file (including `index.ts`).
- For each conflict block:
  - Decide how to merge the logic: keep one side, combine both, or rewrite for compatibility.
  - Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
- For `index.ts`, ensure you preserve:
  - All new/changed exports and CLI logic from both your branch and `main`.
  - Any new error handling, CLI modes, or validation logic.

---

### 3. **Stage the Resolved Files**
```sh
git add path/to/conflicted/file1.ts
git add path/to/conflicted/file2.ts
# ...repeat for all resolved files
```

---

### 4. **Continue the Rebase**
```sh
git rebase --continue
```
- If more conflicts appear, repeat steps 2–4.

---

### 5. **Test Everything**
- Run `yarn kbn bootstrap` (required after changes).
- Run all relevant tests:
  ```sh
  yarn test:jest src/platform/packages/private/kbn-validate-oas
  ```
- Manually test the CLI if you changed CLI logic.

---

### 6. **Force Push Your Branch**
- After the rebase is complete and tested:
  ```sh
  git push origin your-branch --force
  ```

---

### 7. **Reference Docs**
- See [`dev_docs/contributing/how_we_use_github.mdx`](dev_docs/contributing/how_we_use_github.mdx ) and [`docs/extend/development-github.md`](docs/extend/development-github.md ) for Kibana’s rebase/conflict resolution best practices.

---

**Tip:**  
If you’re unsure how to merge a specific block, paste the conflict here and I’ll help you decide how to combine the changes.

Let me know if you want a walkthrough for a specific conflict in this file!
