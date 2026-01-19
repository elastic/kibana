## @kbn/workspaces

Utilities for creating and managing ephemeral Kibana workspaces backed by git worktrees.

The goal is to quickly obtain an isolated checkout of a specific ref / commit, bootstrap its dependencies once, optionally build, and reuse the results across benchmarking or analysis runs without re-cloning the full repository each time.

### How it works (high level)

1. A single lightweight "base" clone of the Kibana repo is created at `<workspacesRoot>/base`.
2. Each requested ref results in a git worktree rooted at `<workspacesRoot>/<random-id>` (detached at the target commit).
3. Workspace lifecycle tasks (checkout -> bootstrap -> build) are cached per commit via small metadata entries stored in `state.json` under the workspaces root.
4. Subsequent requests for the same ref reuse the existing worktree and skip redundant steps when cache keys match.

### Public entry points

```ts
import { activateWorktree, getWorkspaceFromSourceRepo } from '@kbn/workspaces';

// Activate (or create) an isolated worktree for a ref
const worktreeWs = await activateWorktree({ log, ref: '<commit-or-branch>' });
await worktreeWs.ensureCheckout(); // checkout if needed
await worktreeWs.ensureBootstrap(); // yarn kbn bootstrap if needed
await worktreeWs.ensureBuild(); // (placeholder)

// Use the developer's existing source repo workspace, for instance when it
// has uncommited changes
const sourceWs = await getWorkspaceFromSourceRepo({ log, ref: 'HEAD' });
await sourceWs.ensureBootstrap();
```

### Workspace tasks

Each workspace tracks three task states (all nullable until performed):

-> `checkout` – commit present in worktree (`cacheKey = sha`).
--> `bootstrap` – dependencies installed for that commit.
---> `build` – build Kibana for that commit / build hash.

Each task invalidates the successive steps.

### Design notes

- Uses git worktrees to avoid multiple full clones (saves disk & time).
- Detached checkouts prevent accidental commits inside benchmark worktrees.
- Bootstrap enforces the current runtime Node version by updating `package.json` engines and `.nvmrc` / `.node-version` inside the worktree to reduce friction with older refs. (Ideally we'd use a Node.js version manager)

### When to use

Use this utility in tooling or benchmark scripts that need reliable, repeatable environments for multiple commits without paying the cost of a fresh clone + bootstrap each time.
