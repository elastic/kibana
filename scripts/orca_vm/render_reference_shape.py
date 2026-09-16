#!/usr/bin/env python3
"""Render OUR golden extract in the reference board's exact shape.

Emits the agent_eval_full-4 layout (summary matrix + per-model cards with
prompt cards, step cards, tool trails, answers) from the same traces JSON
build_traces_json.py produces. Used for side-by-side comparison against the
original run's board; the reference CSS lives in reference_board_style.css.

Usage:
    python3 render_reference_shape.py --traces /tmp/traces.json \
        --out ~/persona-sweep/agent_eval_full-4-shape.html [--since 2026-09-01]
"""
import argparse, datetime, html, json, re, sys

REF_CSS = open(__file__.replace("render_reference_shape.py","reference_board_style.css")).read()

def esc(s):
    return html.escape(str(s)) if s is not None else ""

PROMPT_ORDER = [
    "alert-analysis-A","alert-analysis-B","alert-analysis-C",
    "entity-analytics-A","entity-analytics-B","entity-analytics-C",
    "threat-hunting-A","threat-hunting-B","threat-hunting-C",
    "detection-rule-edit-A","detection-rule-edit-B","detection-rule-edit-C",
    "workflow-A","workflow-B","workflow-C",
    "multi-step-A","multi-step-B","multi-step-C",
    "log-analysis-A","log-analysis-B","log-analysis-C",
]

PRETTY = {
    "anthropic-claude-4.5-haiku":"Anthropic Claude Haiku 4.5",
    "anthropic-claude-4.5-opus":"Anthropic Claude Opus 4.5",
    "anthropic-claude-4.5-sonnet":"Anthropic Claude Sonnet 4.5",
    "anthropic-claude-4.6-opus":"Anthropic Claude Opus 4.6",
    "anthropic-claude-4.6-sonnet":"Anthropic Claude Sonnet 4.6",
    "anthropic-claude-4.7-opus":"Anthropic Claude Opus 4.7",
    "anthropic-claude-4.8-opus":"Anthropic Claude Opus 4.8",
    "anthropic-claude-5-opus":"Anthropic Claude Opus 5",
    "anthropic-claude-5-sonnet":"Anthropic Claude Sonnet 5",
    "deepseek/deepseek-v4-pro":"deepseek-v4-pro",
    "google/gemma-4-31b-it":"gemma-4-31b-it",
    "moonshotai/kimi-k2.6":"kimi-k2.6",
    "Qwen36_27b":"oss-eval qwen (Foundry)",
}
def pretty(model):
    if model in PRETTY: return PRETTY[model]
    m = model.replace("google-gemini-","Google Gemini ").replace("openai-gpt-","OpenAI GPT-")
    m = m.replace("-flash-lite"," Flash-Lite").replace("-flash"," Flash").replace("-pro"," Pro")
    m = m.replace("-mini"," Mini").replace("-nano"," Nano").replace("-sonnet"," Sonnet").replace("-opus"," Opus")
    m = m.replace("openai-gpt-oss-","OpenAI GPT-OSS ").replace("zai-glm-5-2","ZAI GLM 5.2")
    m = m.replace("gp-llm-v2","gp-llm-v2")
    return m

ALIASES = {
    "anthropic-claude-4-5-haiku":"anthropic-claude-4.5-haiku",
    "anthropic-claude-4-5-opus":"anthropic-claude-4.5-opus",
    "anthropic-claude-4-5-sonnet":"anthropic-claude-4.5-sonnet",
    "anthropic-claude-4-6-opus":"anthropic-claude-4.6-opus",
    "anthropic-claude-4-6-sonnet":"anthropic-claude-4.6-sonnet",
    "anthropic-claude-4-7-opus":"anthropic-claude-4.7-opus",
    "anthropic-claude-4-8-opus":"anthropic-claude-4.8-opus",
    "google-gemini-2-5-flash":"google-gemini-2.5-flash",
    "google-gemini-2-5-flash-lite":"google-gemini-2.5-flash-lite",
    "google-gemini-2-5-pro":"google-gemini-2.5-pro",
    "google-gemini-3-1-pro":"google-gemini-3.1-pro",
    "google-gemini-3-1-flash-lite":"google-gemini-3.1-flash-lite",
    "openai-gpt-5-2":"openai-gpt-5.2",
    "openai-gpt-5-4":"openai-gpt-5.4",
    "openai-gpt-5-4-mini":"openai-gpt-5.4-mini",
    "openai-gpt-5-4-nano":"openai-gpt-5.4-nano",
    "openai-gpt-5-5":"openai-gpt-5.5",
    "deepseek/deepseek-v4-pro-0813":"deepseek/deepseek-v4-pro",
    "openai/gpt-5.6-sol":"openai-gpt-5.6-sol",
}
def fmt_tok(n):
    return f"{n:,}" if n else "0"

def cell_html(cell):
    # mirror: <td class="cell ok" title="ds: prompt"><span class="ok-dot">✓</span> 9 steps<br><span class="sub-num">41s · 217314/2789 tok</span></td>
    if not cell: return '<td class="cell" title="no data"></td>'
    steps = cell.get("stepCount") or 0
    u = cell.get("usage") or {}
    secs = int((u.get("durNs") or 0)/1e9) if u.get("durNs") else 0
    it, ot = u.get("inTok") or 0, u.get("outTok") or 0
    has_ans = bool(cell.get("answer"))
    cls = "cell ok" if has_ans else "cell"
    dot = '<span class="ok-dot">✓</span>' if has_ans else '<span class="status warn">△</span>'
    sub = f'<br><span class="sub-num">{secs}s · {fmt_tok(it)}/{fmt_tok(ot)} tok</span>' if (it or ot) else ""
    return f'<td class="{cls}" title="{esc(cell.get("promptId",""))}"><span class="ok-dot">✓</span> {steps} steps{sub}</td>'

def step_card(step, idx):
    # extract schema: {"type": "tool"|"reasoning"|"skill", "toolId":..., "toolParams": "...json...", "text":...}
    typ = step.get("type") or "reasoning"
    if typ == "tool":
        nm = step.get("toolId") or "tool"
        params = step.get("toolParams")
        body = f'<span class="tool-id">{esc(nm)}</span><span class="tool-params">{esc(params if params else "")}</span>'
        label = esc(nm)
        return (f'<details class="step tool"><summary><span class="step-tag tool-tag">{label}</span></summary>'
                f'<div class="md">{body}</div></details>')
    if typ == "skill":
        skills = step.get("skills") or []
        names = ", ".join(s.get("id","?") for s in skills)
        return (f'<details class="step reasoning"><summary><span class="step-tag">skills: {esc(names)}</span></summary>'
                f'<div class="md">{esc(json.dumps(skills, ensure_ascii=False)[:400])}</div></details>')
    text = step.get("text") or ""
    return (f'<details class="step reasoning"><summary><span class="step-tag">reasoning · {idx}</span></summary>'
            f'<div class="md">{esc(text)}</div></details>')

def steps_html(cell):
    steps = cell.get("steps") or []
    if not steps: return ""
    return "\n".join(step_card(s,i+1) for i,s in enumerate(steps[:400]))
def prompt_card(cell, pid):
    # reference: open card shows prompt text, attachment meta, trace steps, answer
    q = cell.get("question") or ""
    ans = cell.get("answer") or ""
    steps = cell.get("steps") or []
    tools = ", ".join(dict.fromkeys((s.get("toolId") or "?") for s in steps if s.get("type") == "tool"))
    n = len(steps)
    secs = int(((cell.get("usage") or {}).get("durNs") or 0)/1e9)
    meta = f"{n} steps · {secs}s"
    attach = cell.get("attachment") or ""
    attach_html = (f'<p class="attach-meta">attach: {esc(attach[:120])}</p>') if attach else ""
    trail = f'<p class="tool-trail"><strong>Tools called:</strong> <code>{esc(tools)}</code></p>' if tools else ""
    return f'''<details class="prompt" open>
  <summary>
    <span class="status ok">completed</span>
    <span class="prompt-id">{esc(pid)}</span>
    <span class="cat-chip" title="eval category">{esc(pid.rsplit("-",1)[0])}</span>
    <span class="p-meta">{meta}</span>
  </summary>
  <div class="prompt-body">
    <div class="prompt-text"><strong>Prompt sent</strong><blockquote><p>{esc(q)}</p></blockquote>{attach_html}</div>
    <div class="trace"><details class="trace" open><summary>Trace · {n} steps</summary>
    <div class="trace-body">{steps_html(cell)}
    {trail}
    </div></details></div>
    <div class="answer">{ans}</div>
  </div>
</details>'''
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--traces", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--since", default="2026-09-01T00:00Z")
    ap.add_argument("--max-steps-per-cell", type=int, default=400)
    a = ap.parse_args()
    t = json.load(open(a.traces))
    cells = {}
    for k, v in t["cells"].items():
        m, p = k.split(":", 1)
        cells[f"{ALIASES.get(m, m)}:{p}"] = v
    # normalize prompt casing: extract emits lowercase ids; ref uses -A/-B/-C
    norm = {}
    for k, v in cells.items():
        m, p = k.split(":", 1)
        pp = p
        if re.fullmatch(r"[a-z-]+-[abc]", p):
            pp = p[:-1] + p[-1].upper()
        norm[f"{m}:{pp}"] = v
    cells = norm
    models = sorted({k.split(":",1)[0] for k in cells})
    P = []
    P.append('<!DOCTYPE html><html><head><meta charset="utf-8">')
    P.append(f"<title>Agent Builder Skill Eval — golden rebuild</title>")
    P.append(REF_CSS)
    P.append('</head><body><div class="wrap">')
    P.append("<h1>Agent Builder Skill Eval — Golden Rebuild (ours)</h1>")
    P.append(f'<p class="sub">Golden-cluster rebuild of the reference board shape. Each cell is the newest execution per (model, prompt) since {esc(a.since)}. Same layout as the original for side-by-side comparison. Generated {datetime.datetime.utcnow():%Y-%m-%d %H:%M} UTC.</p>')
    # summary matrix
    P.append("<table><thead><tr><th>Model</th>" + "".join(f"<th>{p}</th>" for p in PROMPT_ORDER) + "</tr></thead><tbody>")
    for m in models:
        row = [f'<td class="model"><br><span class="model-id">{esc(m)}</span></td>']
        done = 0
        for p in PROMPT_ORDER:
            c = cells.get(f"{m}:{p}")
            if c and c.get("answer"): done += 1
            row.append(cell_html(c))
        P.append(f"<tr>{''.join(row)}</tr>")
    P.append("</tbody></table>")
    # per-model cards
    for m in models:
        n_done = sum(1 for p in PROMPT_ORDER if (cells.get(f"{m}:{p}") or {}).get("answer"))
        P.append(f'<section class="card" id="{esc(pretty(m).replace(" ","-"))}">')
        P.append(f'<header class="card-head"><h2>{esc(pretty(m))}</h2>')
        P.append(f'<div class="meta"><span class="model-id">{esc(m)}</span><span>·</span><span>{n_done}/21 completed</span></div></header>')
        for p in PROMPT_ORDER:
            c = cells.get(f"{m}:{p}")
            if c:
                P.append(prompt_card(c, p))
            else:
                P.append(f'<p class="empty">no execution for {esc(p)} in window</p>')
        P.append("</section>")
    P.append("</div></body></html>")
    out = "\n".join(P)
    open(a.out, "w").write(out)
    n_cells = sum(1 for m in models for p in PROMPT_ORDER if cells.get(f"{m}:{p}"))
    print(f"wrote {a.out} ({len(out):,} bytes, {len(models)} models, {n_cells} cells with data)")

if __name__ == "__main__":
    main()
