# Libra

Libra is the AI reviewer that posts as `infra-vault-gh-plugin-prod[bot]`. It reviews every commit pushed to a PR, usually within a few minutes, and needs no label or mention. Each review surfaces only one or two findings.

## When it reviews

`.libra/settings.yaml` configures it. Libra skips draft PRs unless they have the `ci:draft-checks` label, and skips any PR labelled `reviewer:skip-ai`. It doesn't review kibanamachine fix-up commits, which is why `pr.sh wait` defaults to the newest commit not pushed by kibanamachine.

`pr.sh wait --for libra` reads Libra's commit status (context `Libra`). `pending` means it's still reviewing. It then ends in one of three states: `Review submitted` (`findings`), `Review completed with noop` (`clean`) or `Review skipped` (`skipped`).

## Where findings appear

Most findings are inline threads (`pr.sh threads <pr> --reviewer libra`). After `findings`, also read the body of Libra's review of that commit, because some findings appear only there:

```bash
gh api repos/elastic/kibana/pulls/<pr>/reviews --paginate \
  --jq '.[] | select(.user.login == "infra-vault-gh-plugin-prod[bot]" and .commit_id == "<sha>") | .body'
```

Triage and fix body-only findings like any other. They have no thread to reply in, so answer them all in one PR comment that links the review and gives the same per-finding answer as a thread reply (`gh pr comment <pr> --body-file <absolute-path>`). There is nothing to resolve; list any that aren't fixed as open items in the final report.

## Replies and follow-ups

Libra reads replies to its comments when it reviews a new commit, and may answer them. Those threads come back from `threads` with `followUp: true`. This is why replies go out before the push.

On a false positive, also react 👎 to Libra's comment so it gets the feedback:

```bash
gh api repos/elastic/kibana/pulls/comments/<commentId>/reactions -f content=-1
```

## Resolving

Libra doesn't resolve its own threads. After the push, resolve the thread of each valid finding yourself:

```bash
pr.sh resolve <threadId>
```

Leave false positives and out-of-scope threads unresolved for human reviewers.

## Self-review

Before committing, read the round's diff the way Libra would: apply `.libra/instructions.md`, and any `.libra/specialists/*.md` whose `apply_to` globs match the changed files.
