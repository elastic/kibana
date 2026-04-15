import json, os

pr_id = os.environ["PR_ID"]

with open('.ralph_pr_meta.json') as f:
    meta = json.load(f)

lines = []
lines.append("# PR #{}: {}".format(pr_id, meta.get('title', '')))
lines.append("State: {}".format(meta.get('state', '')))
lines.append("Base: {} ← Head: {}".format(meta.get('baseRefName', ''), meta.get('headRefName', '')))
labels = [l['name'] for l in meta.get('labels', [])]
if labels:
    lines.append("Labels: {}".format(', '.join(labels)))
lines.append("")
lines.append("## Description")
lines.append(meta.get('body') or '(none)')
lines.append("")

with open('.ralph_diff_summary.txt') as f:
    diff_files = [l.strip() for l in f if l.strip()]
if diff_files:
    lines.append("## Files Changed in PR")
    for df in diff_files:
        lines.append("- {}".format(df))
    lines.append("")

with open('.ralph_issue_comments.json') as f:
    issue_comments = json.load(f)
lines.append("## Issue Comments")
if not issue_comments:
    lines.append("(none)")
for c in issue_comments:
    author = c.get('user', {}).get('login', 'unknown')
    date = c.get('created_at', '')[:10]
    body = c.get('body', '')
    lines.append("- @{} ({}):".format(author, date))
    for bl in body.splitlines():
        lines.append("  {}".format(bl))
lines.append("")

with open('.ralph_review_comments.json') as f:
    review_comments = json.load(f)
lines.append("## Inline Review Comments")
if not review_comments:
    lines.append("(none)")
for c in review_comments:
    author = c.get('user', {}).get('login', 'unknown')
    path = c.get('path', 'unknown')
    line = c.get('line', c.get('original_line', '?'))
    body = c.get('body', '')
    lines.append("- @{} [{}:{}]:".format(author, path, line))
    for bl in body.splitlines():
        lines.append("  {}".format(bl))
lines.append("")

with open('.ralph_context.md', 'w') as f:
    f.write('\n'.join(lines))
