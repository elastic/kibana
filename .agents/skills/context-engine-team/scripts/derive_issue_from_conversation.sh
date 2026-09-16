#!/usr/bin/env bash
#
# derive_issue_from_conversation.sh
#
# Spawn a SEPARATE `claude -p` instance to read the current (or a given) Claude
# Code conversation transcript and derive a structured GitHub-issue brief:
#   - short description
#   - hard product requirements
#   - decisions taken (with alternatives considered)
#   - open questions / possible approaches
#
# The point of the sub-instance is to keep the large transcript OUT of the
# calling agent's context. The calling agent only reads the small brief.
#
# Usage:
#   derive_issue_from_conversation.sh [TRANSCRIPT.jsonl] [OUT.md]
#
#   TRANSCRIPT.jsonl  optional; defaults to the NEWEST transcript in the current
#                     project's session dir (i.e. the live conversation).
#                     Snapshotted BEFORE spawning claude so the child's own new
#                     session file is never picked.
#   OUT.md            optional; defaults to a temp file. Path is printed on stdout.
#
set -euo pipefail

# Claude Code stores each project's transcripts under
# ~/.claude/projects/<slug>, where <slug> is the project's absolute cwd with
# every "/" replaced by "-" (e.g. /path/to/repo -> -path-to-repo).
PROJ_SLUG="$(pwd | sed 's#/#-#g')"
PROJ_DIR="${CE_TRANSCRIPT_DIR:-$HOME/.claude/projects/$PROJ_SLUG}"

TRANSCRIPT="${1:-}"
if [[ -z "$TRANSCRIPT" ]]; then
  TRANSCRIPT="$(ls -t "$PROJ_DIR"/*.jsonl 2>/dev/null | head -1 || true)"
fi
if [[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]]; then
  echo "ERROR: transcript not found. Pass the .jsonl path as arg 1 (looked in $PROJ_DIR)." >&2
  exit 1
fi

OUT="${2:-$(mktemp -t ce_issue_brief.XXXXXX).md}"
EXTRACT="$(mktemp -t ce_convo_extract.XXXXXX).txt"

# 1) Extract a compact, faithful plain-text transcript (user + assistant text,
#    plus lightweight tool markers) so the child reads text, not raw JSONL.
python3 - "$TRANSCRIPT" > "$EXTRACT" <<'PY'
import json, sys
path = sys.argv[1]
def blocks(obj):
    msg = obj.get('message') or {}
    c = msg.get('content')
    if isinstance(c, str):
        return [{'type': 'text', 'text': c}]
    return c if isinstance(c, list) else []
with open(path, encoding='utf-8', errors='replace') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        t = obj.get('type')
        if t == 'user':
            for b in blocks(obj):
                if isinstance(b, dict) and b.get('type') == 'text' and b.get('text', '').strip():
                    print('USER: ' + b['text'].strip() + '\n')
        elif t == 'assistant':
            for b in blocks(obj):
                if not isinstance(b, dict):
                    continue
                if b.get('type') == 'text' and b.get('text', '').strip():
                    print('ASSISTANT: ' + b['text'].strip() + '\n')
                elif b.get('type') == 'tool_use':
                    print('[assistant used tool: %s]\n' % b.get('name', '?'))
PY

if [[ ! -s "$EXTRACT" ]]; then
  echo "ERROR: extracted transcript is empty ($TRANSCRIPT)." >&2
  exit 1
fi

# 2) Ask a separate claude to derive the brief from the extract.
read -r -d '' PROMPT <<PROMPT_EOF || true
You are preparing a GitHub issue for the Context Engine / Agent Builder team.

Read the conversation extract at:
  $EXTRACT

It is a planning/design discussion. Derive a FAITHFUL, structured brief in
markdown with EXACTLY these four sections and headings:

## Short description
2-4 sentences describing the task or feature.

## Hard product requirements
Bullet list of everything stated or clearly implied as a MUST-have / acceptance
criterion. Only include what the conversation supports.

## Decisions taken
Bullet list of concrete design/architecture decisions the conversation reached.
For each, note the alternative(s) considered and why this one was chosen.
Prefix anything left unresolved with "OPEN:".

## Open questions / possible approaches
Undecided points, each with the candidate approaches that were discussed.

Rules:
- Do NOT invent requirements or decisions. If the conversation is thin on a
  section, say "(nothing explicit in the conversation)".
- Preserve concrete issue/PR numbers, file paths, and identifiers verbatim.
- Use the team vocabulary: cases / patterns / improvements (never "issue" for
  the domain concept).
- Output ONLY the markdown brief, nothing else.
PROMPT_EOF

# --dangerously-skip-permissions matches this environment's headless convention
# and lets the child Read the extract file without prompting. Fact extraction is
# a cheap, mechanical task, so run it on a small/cheap model (override with
# CE_EXTRACT_MODEL, e.g. sonnet, for a tougher transcript).
EXTRACT_MODEL="${CE_EXTRACT_MODEL:-haiku}"
claude --dangerously-skip-permissions --model "$EXTRACT_MODEL" -p "$PROMPT" > "$OUT" 2>/dev/null || {
  echo "ERROR: 'claude -p' failed. Ensure the claude CLI is on PATH; flags may" >&2
  echo "       need adjusting for your version. Extract kept at: $EXTRACT" >&2
  exit 2
}

echo "$OUT"
