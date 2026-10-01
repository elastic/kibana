---
name: libra-review-loop
description: Drives an elastic/kibana PR through Libra AI review rounds until Libra has nothing left to say. Waits for Libra's review on the pushed commit, fixes each finding together with every other instance of the same problem, checks that new guard tests actually fail, replies in the threads, then pushes once per round and resolves the fixed threads. Use when the user asks to address, fix, or loop on Libra review comments, or comments from infra-vault-gh-plugin-prod[bot].
---

# Libra Review Loop

Libra is the AI reviewer that posts as `infra-vault-gh-plugin-prod[bot]`. It reviews every commit pushed to a PR, usually within two minutes, and needs no label or mention. Each review surfaces only one or two findings, so the loop goes faster when each round fixes **every case of a problem** instead of only the line Libra flagged, and doesn't hand Libra new weak code to review.

This skill commits, pushes, replies to and resolves threads without asking. The user opted into this by invoking it. Every other GitHub rule in the `kbn-github` skill still applies.

## Helper script

`scripts/libra.sh` (run with `bash`; it needs network access to the GitHub API):

| Command | Result |
|---|---|
| `libra.sh wait <pr> [--sha <sha>]` | Blocks for up to 20 minutes, then prints `libra=<clean\|findings\|skipped\|error\|none\|timeout> sha=… description="…"` |
| `libra.sh threads <pr>` | One JSON object per unresolved thread where Libra commented last: `threadId`, `commentId`, `path`, `line`, `isOutdated`, `url`, `body`, `followUp`, `otherReplies`, plus `latestCommentId` and `latestBody` when `followUp` is true |
| `libra.sh resolve <thread-id>` | Resolves the thread and prints `true` |

`wait` reads Libra's commit status. `pending` means it's still reviewing. Then it ends in one of three states: `Review submitted` (findings), `Review completed with noop` (clean) or `Review skipped`.

## Before the first round

1. Resolve the PR: `gh pr view [<pr>] --json number,headRefName,isDraft,labels,url`. Pass the number when the user gave one; without it, `gh` uses the PR for the current branch.
2. Check that Libra will review it (see `.libra/settings.yaml`). Libra skips draft PRs unless they have the `ci:draft-checks` label, and skips any PR labelled `reviewer:skip-ai`. If either applies, tell the user and stop. Don't change labels or the draft state yourself.
3. Make sure you're on the PR's head branch, because every commit and push in the loop goes to the current branch. If `git branch --show-current` isn't `headRefName`, or the branch doesn't track the PR's head repository, run `gh pr checkout <pr>`. If the working tree has uncommitted changes that aren't part of this PR, stop and ask the user instead.
4. Make sure the local branch has the PR head (`git status -sb`, then `git pull --rebase` if it's behind). kibanamachine pushes fix-up commits to PR branches, and Libra doesn't review those.

## The loop

Run at most **5 rounds**. Copy this checklist into your notes for each round:

```
Round N:
- [ ] 1. Wait for Libra on the pushed commit
- [ ] 2. Collect unanswered threads
- [ ] 3. Triage each finding
- [ ] 4. Fix every instance of each rule
- [ ] 5. Prove new guard tests fail
- [ ] 6. Run local checks
- [ ] 7. Commit (if anything changed)
- [ ] 8. Reply in threads
- [ ] 9. Push and resolve
```

### 1. Wait

In the first round, run `wait` without `--sha`. It then checks the newest PR commit not pushed by kibanamachine, which is the last commit Libra could have reviewed:

```bash
bash .agents/skills/libra-review-loop/scripts/libra.sh wait <pr>
```

In later rounds, pass the commit you pushed in step 9, so a kibanamachine commit pushed after it doesn't hide Libra's result:

```bash
bash .agents/skills/libra-review-loop/scripts/libra.sh wait <pr> --sha <pushed-sha>
```

- `clean` or `findings`: continue with step 2. A clean review of the latest commit doesn't answer older threads.
- `skipped`, `none`, `error` or `timeout`: stop and report the state and description to the user. Don't push an empty commit to retrigger Libra.

### 2. Collect

```bash
bash .agents/skills/libra-review-loop/scripts/libra.sh threads <pr>
```

This also returns older threads that were never answered, so nothing gets lost between rounds.

Libra reads replies to its comments when it reviews a new commit, and may answer them. Those threads come back with `followUp: true`; Libra's answer is in `latestBody`, and `otherReplies` counts the replies already posted. Handle them in step 3 under "Follow-ups", not as new findings.

If `threads` prints nothing:

- After `clean`: stop and write the final report.
- After `findings`: the findings may be in the review body rather than in threads. Find the latest Libra review with `gh api repos/elastic/kibana/pulls/<pr>/reviews --paginate --jq '.[] | select(.user.login | startswith("infra-vault")) | .id' | tail -n 1`, then read it with `gh api repos/elastic/kibana/pulls/<pr>/reviews/<id> --jq .body`.

### 3. Triage

Read the code at the current HEAD for each finding. Don't rely on the snippet quoted in the comment, especially when `isOutdated` is true. Classify each one:

- **Valid**: the problem is real.
- **False positive**: the claim is wrong. Prove it with a quick experiment or a pointer to the code, and change nothing.
- **Out of scope**: the problem is real but belongs to another change, needs an owner's or product decision, or would change behavior the PR doesn't intend to change.

If a finding needs a product or ownership decision, stop the loop and ask the user.

**Follow-ups** (`followUp: true`). Read Libra's answer in `latestBody` against the code and your earlier reply:

- **Libra is right**: treat the thread as a valid finding from here on, and say in the reply that its answer changed your mind.
- **Libra is still wrong and `otherReplies` is 1**: reply once more with new evidence only, such as a test that fails or passes or the exact code path. Don't repeat the earlier argument.
- **Libra is still wrong and `otherReplies` is 2 or more**: don't reply again. Leave the thread unresolved for a human reviewer and list it in the final report.

### 4. Fix the rule, not the line

For each valid finding:

1. **State the rule it breaks** in one sentence. Make it general, for example "an input limit must not be stricter than the vendor's documented limit" or "an Agent Builder-only docs page must not describe actions agents can't run".
2. **Sweep for every instance.** Start with all files the PR touches (`gh pr diff <pr> --name-only`), then search the affected packages with `rg`. Fix every instance in files the PR already changes. List instances in untouched code in the thread reply instead of widening the PR.
3. **Add a check if the rule is mechanical** and a natural place exists, such as a package's contract test. Skip this step for one-off logic bugs.

Typical rules Libra flags in Kibana code:

- A limit or validation stricter than what the vendor accepts, or stricter on read than on write.
- A caller-supplied or response-supplied URL fetched with the connector's credentials without checking its host.
- Docs that contradict the spec (availability, which actions are tools, defaults).
- A test that passes even when the rule it guards is broken.

### 5. Prove new guard tests fail

Every test you add or change this round becomes new code for Libra to review. For each one:

1. Temporarily break the rule it guards, in the way most likely to slip through. Examples: drop a marker from one item and add it to an unrelated one, or remove a `.max()` from a nested or preprocessed field.
2. Run the test and confirm it fails with a message that names the problem.
3. Restore the code and confirm the test passes again.

Then read the round's full diff (`git diff`) as Libra would. Apply `.libra/instructions.md`, and any `.libra/specialists/*.md` whose `apply_to` globs match the changed files, along with the kinds of problems listed in step 4.

### 6. Local checks

Run scoped checks on what changed, as described in `AGENTS.md`:

- Jest for each affected package.
- `node scripts/eslint --fix` on the changed files.
- A type check for each affected `tsconfig.json`.
- If any `.md` docs changed, look for wording problems the Vale docs check would flag.

Fix any failures before committing.

### 7. Commit

If the round changed files, first pick up any kibanamachine commits (`git stash && git pull --rebase && git stash pop`), so the commit SHA you quote in the replies doesn't change when you push. Then make one commit. Write a message that says what the round fixed and why, not "Address comments". Don't push yet.

If nothing changed, because every finding was a false positive, out of scope, or a follow-up that needs only a reply, skip to step 8. There will be no push in step 9.

### 8. Reply

Post the replies before pushing. Libra reads the discussion when it starts reviewing a new commit, so replies posted after the push may be missed.

Reply in every thread from step 2, except follow-ups that step 3 says to leave alone. Always reply to the thread's first comment (`commentId`), including for follow-ups. Write the body to a file and pass it with `-F body=@<absolute-path>`:

```bash
gh api repos/elastic/kibana/pulls/<pr>/comments -F in_reply_to=<commentId> -F body=@/tmp/libra-reply-<commentId>.md
```

- **Valid**: say what changed, in which commit (the SHA from step 7), which other instances of the rule were fixed, and which check now guards it.
- **False positive**: give the evidence, such as the experiment you ran or the code that shows the claim is wrong. React 👎 so Libra gets the feedback (`gh api repos/elastic/kibana/pulls/comments/<commentId>/reactions -f content=-1`). Leave the thread unresolved so a human reviewer can see it.
- **Out of scope**: explain why, and say who should decide or where it will be handled. Leave the thread unresolved.

Write the replies for human reviewers: short, plain sentences, with no restatement of Libra's comment.

### 9. Push and resolve

If step 7 made a commit, `git push` to the branch's upstream. If the push is rejected because kibanamachine pushed in the meantime, run `git pull --rebase`, push again, and edit the replies to quote the new SHA (`gh api -X PATCH repos/elastic/kibana/pulls/comments/<reply-id> -F body=@<file>`). Never force-push. Note the pushed SHA with `git rev-parse HEAD`, then run `libra.sh resolve <threadId>` for each valid finding. Go back to step 1 with `--sha <pushed-sha>`. After round 5, run only `wait` on the pushed SHA so the final report can give Libra's state on it, then stop.

If nothing was committed, there's no push and Libra won't review again. Stop and write the final report.

## Stopping early

Stop and report to the user when any of these happens:

- Libra flags the same rule again after you fixed it. Your sweep or check missed something, and another automatic round is unlikely to help.
- A local check fails and the fix isn't clear.
- Round 5 ends. Wait for Libra on its push as described in step 9, but don't start a sixth round.

## Final report

Tell the user:

- How many rounds ran, and Libra's final state on the last commit.
- Each rule fixed, with the files and the check that now guards it.
- The threads left open (false positives, out of scope, and disagreements with Libra that a human needs to settle), with links.
- Instances of a rule found in code the PR doesn't touch.
