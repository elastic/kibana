# Demo prep - AI-Assisted PR Review with Domain Knowledge

## Checklist for Thursday morning

- [x] Close noisy notifications (Slack, mail, calendar).
- [x] Confirm `gh auth status` and `node --version` in both terminals.

- [x] Open the planted PR in the browser; confirm it's draft, comments empty, no other reviews.
- [x] Pull up the planted PR in the browser, scroll to the diff (showing one of the violations) — this is the opening shot.
- [x] Open real PRs in the browser.
- [x] Open domain knowledge files in vscode (kibana).
- [x] Open domain catalog in dex-dev-skills.
- [x] Open code review skill in dex-dev-skills.

- [x] Run the seed script once on the local Kibana instance to populate "today's birthday" rules.
- [x] Prepare terminals (see below).
- [x] Do a final dry-run of both terminals end-to-end (`dex-review-code`).
- [x] Confirm the backup recording is loaded and ready to switch to.
- [x] Set terminals to a clean prompt.

## Prepare terminals

Terminal 1 (domain-aware review):

```bash
kbn demo-review-domain
gco eah-madrid/ai-workshop/rule-birthdays

claude
/rename DOMAIN-aware-review
/model # Sonnet 4.6
# Set auto mode
```

Terminal 2 (generic review):

```bash
kbn demo-review-generic
gco eah-madrid/ai-workshop/rule-birthdays

claude --plugin-dir ~/Code/elastic/dex-dev-skills-pr1
/rename GENERIC-review
/model # Sonnet 4.6
# Set auto mode
```
