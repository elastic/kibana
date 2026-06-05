# Demo prep - AI-Assisted PR Review with Domain Knowledge

## Checklist for Thursday morning (T - 8h)

- [ ] Run the seed script once on the local Kibana instance to populate "today's birthday" rules.
- [ ] Open the planted PR in the browser; confirm it's draft, comments empty, no other reviews.
- [ ] Do a final dry-run of both terminals end-to-end (`dex-review-checkout` → `dex-review-code` → `dex-review-post`). Time each run, write the timings on a sticky note.
- [ ] Confirm any leftover pending reviews from previous dry-runs are deleted (`--repost` flag handles this) or manually clean on github.com.
- [ ] Confirm `gh auth status` and `node --version` in both terminals.
- [ ] Confirm the editor has the domain knowledge files pre-opened in tabs.

## Checklist for workshop start (T - 30m)

- [ ] Close noisy notifications (Slack, mail, calendar).
- [ ] Reset both terminals to a clean prompt.
- [ ] Pull up the planted PR in the browser, scroll to the diff (showing one of the violations) — this is the opening shot.
- [ ] Confirm the backup recording is loaded and ready to switch to.

## Review terminals

Terminal 1 (domain-aware review):

```bash
cd ~/Code/elastic/kibana-demo-review-domain
gco eah-madrid/ai-workshop/rule-birthdays

claude
/rename DOMAIN-aware-review
/model # Sonnet 4.6
# Set auto mode
```

Terminal 2 (generic review):

```bash
cd ~/Code/elastic/kibana-demo-review-generic
gco eah-madrid/ai-workshop/rule-birthdays

claude
/rename GENERIC-review
/model # Sonnet 4.6
# Set auto mode
```
