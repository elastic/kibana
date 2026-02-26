# SDH Report Template

Use this template when writing the investigation report. Omit empty sections.

**Save to:** `.cursor/sdh/ISSUE/sdh_report_ISSUE.md`

⚠️ **Before saving**: Redact customer PII. Replace the **entire value** with a placeholder — no partial redaction (e.g., `smtp.<redacted>.com` is wrong, `[HOSTNAME]` is correct).

Watch for:
- **Tokens & keys**: JWTs (`eyJ...`), GitHub (`ghp_*`, `gho_*`), Slack (`xox*-`), AWS (`AKIA...`), Stripe (`sk_live_*`), Bearer/Basic auth headers
- **Connection strings**: DB URLs (`mongodb://`, `postgres://`), Azure (`DefaultEndpointsProtocol=`), URLs with credentials (`user:pass@`)
- **Crypto**: private keys (`-----BEGIN`), certificates, Session-ID, Master-Key
- **PII**: emails, IPv4 addresses, all hostnames/FQDNs, Elastic Cloud URLs
- **Fields by name**: `password`, `secret`, `api_key`, `token`, `user_id`, `author`, `username`, `created_by`, `license_key`
- **Infrastructure**: K8s namespaces, node names, container IDs, service names, cluster/deployment IDs
- **SDH fields**: customer name, case ID, Slack channel links, deployment URLs

---

```markdown
# Debugging Report: Issue #ISSUE

## Summary

- **Issue:** [REPO #ISSUE](https://github.com/REPO/issues/ISSUE)
- **Problem:** One-sentence description
- **Version:** X.Y.Z
- **Status:** pending_on_dev | pending_on_support | closed

## Discussion

Max 5 bullets showing the most recent key developments. Summarize older history in a single TL;DR line at the top. One line per event — who, what, and outcome.

- **TL;DR:** One-sentence summary of older thread history (if any)
- **YYYY-MM-DD (@user):** One-sentence summary of what happened or was discovered
- **YYYY-MM-DD (@user):** Next key development

## Artifact Analysis

### filename (lines X-Y)

```[file extension|content type]
[quoted evidence from artifact]
```

Interpretation of what this evidence shows.

## Code Analysis

### filepath (lines X-Y)

```ts
[quoted code snippet]
```

Explanation of how this code relates to the reported issue.

## Similar Issues

- [#NUMBER](URL): Why this issue is similar
- [#NUMBER](URL): Why this issue is similar

## Related PRs

- [PR title](URL): How this PR relates — "fixes", "may address", "similar symptoms"

## Conclusion

**Confidence:** Proven | Strongly supported | Plausible | Insufficient

### Diagnosis

The root cause finding in 1-2 paragraphs. Must be provable with specific evidence quoted above.
If confidence is "Insufficient": "Insufficient evidence to form hypothesis."

### Fixed In

(Only if a fix exists. Omit "Next Steps" if this section is present.)

PR #NUMBER (version X.Y.Z+)

### Evidence Summary

In 2-3 sentences, explain *how you know* — connect the evidence that supports the diagnosis. Reference findings by section (e.g. "the HAR analysis shows...") but don't re-quote them. Don't re-explain the diagnosis.

### Missing Information

(Required when confidence is "Insufficient")

- What information is missing and why it prevents diagnosis
- What would increase confidence

### Unanswered Questions

(Include questions from the thread that remain unanswered — from support agents, customers, or engineers.)

- @support_agent asked about X on YYYY-MM-DD — no response yet
- Customer mentioned Y but didn't clarify Z

### Next Steps

(Omit if "Fixed In" is present. Only information-gathering actions — no fixes.)

- Request Kibana server logs from the time of the error
- Verify if PR #12345 (8.12.1+) addresses this issue
- Clarify with customer whether SAML auth is enabled — asked in thread but unanswered
```
