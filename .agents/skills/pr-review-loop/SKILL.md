---
name: pr-review-loop
description: Babysits an elastic/kibana PR until its automated reviewers and CI are satisfied. Each round waits for Libra and the Claude reviewer on the pushed commit, fixes each finding together with every other instance of the same problem, merges the base branch when the PR has conflicts, and fixes CI failures the PR caused. It replies in the threads, pushes once per round, and resolves fixed threads. Use when the user asks to babysit a PR, get a PR green or merge-ready, loop on AI review comments (Libra, infra-vault-gh-plugin-prod[bot], reviewer:claude), or fix CI on their PR.
---

# PR Review Loop

A PR gets feedback from several automated sources. Each one reports a few problems at a time and reacts to every push, so getting a PR clean takes several rounds of push, wait and fix. This skill runs those rounds. Each round fixes **every case of a problem** instead of only the flagged line, and avoids handing the reviewers new weak code.

The loop acts on these signals:

| Signal | Active when | Reference |
|---|---|---|
| Libra (`infra-vault-gh-plugin-prod[bot]`) | Always, unless the PR is a draft without `ci:draft-checks` or has `reviewer:skip-ai` | [references/libra.md](references/libra.md) |
| Claude reviewer (`github-actions[bot]`) | The PR has the `reviewer:claude` label and not `reviewer:skip-ai` | [references/claude.md](references/claude.md) |
| CI (`kibana-ci`, Buildkite) | Always, unless the PR is a draft without `ci:build-draft` or has `skip-ci` | [references/ci.md](references/ci.md) |
| Merge conflicts | GitHub reports the PR as `CONFLICTING` | [Sync with the base branch](#sync-with-the-base-branch) |

Comments from humans are out of scope. Don't reply to them, resolve them, or change code because of them. List any new ones in the final report.

This skill commits, pushes, replies to and resolves threads without asking. The user opted into this by invoking it. Every other GitHub rule in the `kbn-github` skill still applies.

## Helper script

`scripts/pr.sh` (run with `bash`; it needs network access to the GitHub API):

| Command | Result |
|---|---|
| `pr.sh signals <pr>` | One line per signal, `on` or `off` with a reason, then `mergeable=<MERGEABLE\|CONFLICTING\|UNKNOWN> base=… head=…` |
| `pr.sh wait <pr> --for <libra,claude,ci> [--sha <sha>] [--timeout <s>]` | Blocks until each listed signal has a result, then prints one line each, such as `libra=findings sha=… detail="…"`. `--timeout 0` polls once and reports `pending` for unfinished signals |
| `pr.sh threads <pr> --reviewer <libra\|claude>` | One JSON object per unresolved thread the reviewer opened and commented on last: `threadId`, `commentId`, `path`, `line`, `isOutdated`, `url`, `body`, `followUp`, `otherReplies`, plus `latestCommentId` and `latestBody` when `followUp` is true |
| `pr.sh resolve <thread-id>` | Resolves the thread and prints `true` |

Reviewer results are `clean`, `findings`, `skipped`, `error`, `none` (no result within the startup window) or `timeout`. CI results are `passed`, `failed`, `none` or `timeout`. `--sha` applies to the reviewers; CI always follows the PR head. Below, `pr.sh` stands for `bash .agents/skills/pr-review-loop/scripts/pr.sh`.

## Before the first round

1. Resolve the PR: `gh pr view [<pr>] --json number,headRefName,baseRefName,isDraft,labels,url`. Pass the number when the user gave one; without it, `gh` uses the PR for the current branch.
2. Run `pr.sh signals <pr>` and tell the user which signals are on. Read the reference for each active signal. If no reviewer and no CI is active, stop. Don't change labels or the draft state yourself.
3. Make sure you're on the PR's head branch, because every commit and push in the loop goes to the current branch. If `git branch --show-current` isn't `headRefName`, or the branch doesn't track the PR's head repository, run `gh pr checkout <pr>`. If the working tree has uncommitted changes that aren't part of this PR, stop and ask the user instead.
4. Make sure the local branch has the PR head (`git status -sb`, then `git pull --rebase` if it's behind). kibanamachine pushes fix-up commits to PR branches.

## Reviewers first, CI last

The reviewers answer within a few minutes (Libra) to half an hour (Claude). A CI build takes about an hour and starts over on every push. So each round waits only for the reviewers. If CI has already failed on the current head, those failures are fixed in the same round, but the loop doesn't wait for a new build while reviewers still have findings. Once the reviewers are done, the loop waits for CI on the final commit (see [Final CI wait](#final-ci-wait)).

## The loop

Run at most **5 rounds**. Copy this checklist into your notes for each round:

```
Round N:
- [ ] 1. Wait for the reviewers on the pushed commit
- [ ] 2. Collect findings
- [ ] 3. Sync with the base branch if conflicting
- [ ] 4. Triage each finding
- [ ] 5. Fix every instance of each rule
- [ ] 6. Prove new guard tests fail
- [ ] 7. Run local checks
- [ ] 8. Commit (if anything changed)
- [ ] 9. Reply in threads
- [ ] 10. Push and resolve
```

### 1. Wait

List the active reviewers in `--for`. In the first round, don't pass `--sha`; the script then checks the newest PR commit not pushed by kibanamachine:

```bash
pr.sh wait <pr> --for libra,claude
```

In later rounds, pass the commit you pushed in step 10, so a kibanamachine commit pushed after it doesn't hide the result:

```bash
pr.sh wait <pr> --for libra,claude --sha <pushed-sha>
```

For each reviewer:

- `clean` or `findings`: continue with step 2. A clean review of the latest commit doesn't answer older threads.
- `none` or `skipped` in the first round: the reviewer never reviewed this commit, for example because its label was added later. Continue with step 2 so its existing threads still get handled.
- `none` or `skipped` in a later round, `error`, or `timeout`: stop and report the reviewer, state and detail to the user. Don't push an empty commit to retrigger a review.

When a round pushed only a merge commit (see step 3), skip this step: the reviewers don't review merges. Go to the [Final CI wait](#final-ci-wait).

### 2. Collect

For each active reviewer:

```bash
pr.sh threads <pr> --reviewer <libra|claude>
```

This also returns older threads that were never answered, so nothing gets lost between rounds. Threads with `followUp: true` are the reviewer answering a reply. Its answer is in `latestBody`, and `otherReplies` counts the replies already posted. Handle them in step 4 under "Follow-ups", not as new findings. Each reference says where else that reviewer reports findings, such as Libra's review body.

Then take a CI snapshot of the PR head:

```bash
pr.sh wait <pr> --for ci --timeout 0
```

If it reports `failed`, collect the failures as described in [references/ci.md](references/ci.md). If it's `pending` or `passed`, there's nothing to collect from CI this round.

If every reviewer was `clean` or had no review, `threads` printed nothing for any of them, CI hasn't failed, and the PR isn't conflicting, go to the [Final CI wait](#final-ci-wait).

### 3. Sync with the base branch

If `pr.sh signals <pr>` reports `mergeable=CONFLICTING`, merge the base branch before triaging, so findings are judged and fixed against the merged code. `UNKNOWN` means GitHub is still computing; run `signals` again after a few seconds.

```bash
git fetch origin <baseRefName>
git merge origin/<baseRefName>
```

Never rebase or force-push the PR branch; a merge commit keeps the pushed history intact. Resolve a conflict only when the right result is clear from both sides, such as two independent additions to the same list, or an import moved on one side and added to on the other. For generated files, regenerate them with the tool that produced them instead of editing the conflict markers. If any conflict needs a judgment about which behavior to keep, run `git merge --abort`, stop, and ask the user.

Commit the merge on its own (`git commit --no-edit`). Don't push yet. The round's fix commit goes on top of it, so the head of the push is a normal commit that the reviewers will review.

### 4. Triage

Read the code at the current HEAD for each finding. Don't rely on the snippet quoted in the comment, especially when `isOutdated` is true. Classify each one:

- **Valid**: the problem is real.
- **False positive**: the claim is wrong. Prove it with a quick experiment or a pointer to the code, and change nothing.
- **Out of scope**: the problem is real but belongs to another change, needs an owner's or product decision, or would change behavior the PR doesn't intend to change.

CI failures get the same three classes. [references/ci.md](references/ci.md) explains how to tell a failure the PR caused from a flaky or unrelated one, and what to do with the latter.

If a finding needs a product or ownership decision, stop the loop and ask the user.

**Follow-ups** (`followUp: true`). Read the reviewer's answer in `latestBody` against the code and your earlier reply:

- **The reviewer is right**: treat the thread as a valid finding from here on, and say in the reply that its answer changed your mind.
- **The reviewer is still wrong and `otherReplies` is 1**: reply once more with new evidence only, such as a test that fails or passes or the exact code path. Don't repeat the earlier argument.
- **The reviewer is still wrong and `otherReplies` is 2 or more**: don't reply again. Leave the thread unresolved for a human reviewer and list it in the final report.

### 5. Fix the rule, not the line

For each valid finding:

1. **State the rule it breaks** in one sentence. Make it general, for example "an input limit must not be stricter than the vendor's documented limit" or "a test must fail when the behavior it guards is removed".
2. **Sweep for every instance.** Start with all files the PR touches (`gh pr diff <pr> --name-only`), then search the affected packages with `rg`. Fix every instance in files the PR already changes. List instances in untouched code in the thread reply instead of widening the PR.
3. **Add a check if the rule is mechanical** and a natural place exists, such as a package's contract test. Skip this step for one-off logic bugs.

Typical rules reviewers flag in Kibana code:

- A limit or validation stricter than what the vendor accepts, or stricter on read than on write.
- A caller-supplied or response-supplied URL fetched with the connector's credentials without checking its host.
- Docs that contradict the code (availability, which actions are tools, defaults).
- A test that passes even when the rule it guards is broken.

### 6. Prove new guard tests fail

Every test you add or change this round becomes new code for the reviewers. For each one:

1. Temporarily break the rule it guards, in the way most likely to slip through. Examples: drop a marker from one item and add it to an unrelated one, or remove a `.max()` from a nested or preprocessed field.
2. Run the test and confirm it fails with a message that names the problem.
3. Restore the code and confirm the test passes again.

Then read the round's full diff (`git diff`) the way the active reviewers would, using the review instructions each reference points to, along with the kinds of problems listed in step 5.

### 7. Local checks

Run scoped checks on what changed, as described in `AGENTS.md`:

- Jest for each affected package, including any test that failed in CI.
- `node scripts/eslint --fix` on the changed files.
- A type check for each affected `tsconfig.json`.
- If any `.md` docs changed, look for wording problems the Vale docs check would flag.

Fix any failures before committing.

### 8. Commit

If the round changed files, make one commit. Write a message that says what the round fixed and why, not "Address comments". Then run `git pull --rebase` to pick up any kibanamachine commits, so the SHA you quote in the replies (`git rev-parse HEAD`, taken after the rebase) doesn't change when you push. If step 3 made a merge commit, use `git pull --rebase=merges` instead, so the merge is kept. Don't push yet.

If nothing changed, because every finding was a false positive, out of scope, or a follow-up that needs only a reply, skip to step 9. There will be no fix commit in step 10.

### 9. Reply

Post the replies before pushing. Reviewers that read the discussion do so when they start reviewing a new commit, so replies posted after the push may be missed.

Reply in every thread from step 2, except follow-ups that step 4 says to leave alone. Always reply to the thread's first comment (`commentId`), including for follow-ups. Write the body to a file and pass it with `-F body=@<absolute-path>`:

```bash
gh api repos/elastic/kibana/pulls/<pr>/comments -F in_reply_to=<commentId> -F body=@/tmp/pr-reply-<commentId>.md
```

- **Valid**: say what changed, in which commit (the SHA from step 8), which other instances of the rule were fixed, and which check now guards it.
- **False positive**: give the evidence, such as the experiment you ran or the code that shows the claim is wrong. Leave the thread unresolved so a human reviewer can see it.
- **Out of scope**: explain why, and say who should decide or where it will be handled. Leave the thread unresolved.

Each reference adds what that reviewer needs in a reply, such as a reaction or a mention.

CI failures have no thread. Don't comment about them; the final report covers them.

Write the replies for human reviewers: short, plain sentences, with no restatement of the reviewer's comment.

### 10. Push and resolve

If steps 3 or 8 made a commit, `git push` to the branch's upstream. If the push is rejected because kibanamachine pushed in the meantime, run `git pull --rebase` (`--rebase=merges` if there's a merge commit), push again, and edit the replies to quote the new SHA (`gh api -X PATCH repos/elastic/kibana/pulls/comments/<reply-id> -F body=@<file>`). Never force-push. Note the pushed SHA with `git rev-parse HEAD`, then resolve the threads of valid findings as each reference describes. Go back to step 1 with `--sha <pushed-sha>`.

After round 5, run only `wait` on the pushed SHA and, if it reports findings, step 2's collection, so the final report can give each reviewer's state on that commit and link its new findings. Then do the final CI wait and stop.

If nothing was committed, there's no push and the reviewers won't review again. Go to the final CI wait.

## Final CI wait

When the reviewers have nothing left, or the loop is out of rounds or has stopped without a push, wait for CI on the PR head:

```bash
pr.sh wait <pr> --for ci
```

- `passed`: write the final report.
- `failed`: triage the failures as described in [references/ci.md](references/ci.md). If the PR caused them and rounds are left, start another round. Its step 1 returns right away, because the reviewers already reviewed this commit, and step 2 collects the CI failures. Otherwise follow the reference for flaky or unrelated failures, and report.
- `none`: CI didn't run, for example because the PR only changes docs. Say so in the final report.
- `timeout`: report the build link and stop.

## Stopping early

Stop and report to the user when any of these happens:

- A reviewer flags the same rule again after you fixed it. Your sweep or check missed something, and another automatic round is unlikely to help.
- The same CI test fails again after a fix or a retry.
- A local check fails and the fix isn't clear.
- A merge conflict needs a judgment call.
- Round 5 ends. Wait for the reviewers and CI on its push as described in step 10, but don't start a sixth round.

## Final report

Tell the user:

- How many rounds ran, each reviewer's final state on the last commit, and CI's final state with the build link.
- Each rule fixed, with the files and the check that now guards it.
- CI failures fixed, and any retried as flaky, with links.
- Any merge with the base branch and how the conflicts were resolved.
- The threads left open (false positives, out of scope, disagreements a human needs to settle, and fixed threads the reviewer hasn't resolved yet), with links.
- Instances of a rule found in code the PR doesn't touch.
- New comments from humans, with links.
