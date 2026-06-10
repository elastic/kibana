---
marp: true
size: 16:9
paginate: true
footer: 'AI-Assisted PR Review with Domain Knowledge · Madrid 2026 · Georgii Gorbachev'
---

<style>
:root {
  --elastic-blue: #1BA9F5;
  --elastic-teal: #00BFB3;
  --elastic-orange: #FA744E;
  --text: #1A1C21;
  --muted: #6A717D;
  --border: #D3DAE6;
  --bg-soft: #F5F7FA;
  --bg-card: #FAFBFC;
  --bg-domain: #E6FFFB;
  --bg-generic: #FFF4ED;
}

section {
  font-family: -apple-system, "Segoe UI", Inter, "Helvetica Neue", sans-serif;
  color: var(--text);
  font-size: 24px;
  padding: 40px 56px 30px;
  background: #ffffff;
  justify-content: flex-start;
}

section h1 {
  font-size: 34px;
  margin: 0 0 4px;
  color: var(--text);
  border-bottom: 3px solid var(--elastic-teal);
  padding-bottom: 6px;
}

section h2 {
  font-size: 20px;
  color: var(--muted);
  font-weight: 400;
  margin: 0 0 12px;
}

section header {
  font-size: 13px;
  color: var(--muted);
  padding: 12px 64px 0;
}

section footer {
  font-size: 13px;
  color: var(--muted);
  padding: 0 64px 12px;
}

section ul { font-size: 22px; margin: 14px 0; }
section li { margin: 4px 0; }

code {
  font-family: "SF Mono", Monaco, Consolas, monospace;
  font-size: 0.92em;
  background: var(--bg-soft);
  padding: 1px 6px;
  border-radius: 3px;
}

strong { color: var(--text); }

/* ===== Comparison columns ===== */
.two-col {
  display: flex;
  gap: 14px;
  margin: 8px 0;
}
.two-col > div {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
}
.col-generic { border-top: 4px solid var(--elastic-orange); }
.col-domain  { border-top: 4px solid var(--elastic-teal); }

.col-label {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
}
.col-file {
  font-family: "SF Mono", Monaco, Consolas, monospace;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}
.col-empty {
  opacity: 0.4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: italic;
  font-size: 14px;
  color: var(--muted);
}

/* ===== Images ===== */
img {
  max-width: 100%;
  object-fit: contain;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  border-radius: 4px;
  display: block;
  margin: 0 auto;
}
section.pr-row img { max-height: 490px; }
section.pr-row-stacked img { max-height: 215px; }

/* ===== Slide 0 cards ===== */
.cards {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}
.card {
  flex: 1;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: white;
  font-size: 17px;
  line-height: 1.4;
}
.card-highlight {
  border: 2px solid var(--elastic-teal);
  background: var(--bg-domain);
}
.card-muted { opacity: 0.4; }
.card-star {
  display: inline-block;
  color: var(--elastic-teal);
  font-size: 18px;
  margin-right: 4px;
}

/* ===== Slide 2 flow ===== */
.flow {
  display: flex;
  align-items: stretch;
  gap: 6px;
  margin: 60px 0 30px;
}
.flow-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.flow-box {
  padding: 22px 12px;
  border-radius: 6px;
  background: var(--bg-soft);
  border: 2px solid var(--elastic-blue);
  text-align: center;
  font-size: 17px;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.4;
}
.flow-box strong { color: var(--elastic-blue); }
.flow-caption {
  font-size: 14px;
  color: var(--muted);
  margin-top: 10px;
  text-align: center;
  font-style: italic;
}
.flow-arrow {
  display: flex;
  align-items: center;
  font-size: 28px;
  color: var(--elastic-teal);
  padding: 0 4px;
  height: 160px;
}

/* ===== Slide 3 anatomy ===== */
.anatomy {
  display: flex;
  gap: 20px;
  margin-top: 16px;
}
.anatomy > div {
  flex: 1;
  padding: 14px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
}
.anatomy pre {
  margin: 8px 0 0;
  background: #1A1C21;
  color: #E6E6E6;
  padding: 16px;
  border-radius: 4px;
  font-family: "SF Mono", Monaco, Consolas, monospace;
  font-size: 15px;
  line-height: 1.55;
  overflow: hidden;
}
.anatomy .col-label { color: var(--elastic-teal); font-size: 14px; }

/* ===== Slide 4 headline ===== */
section.headline-slide {
  text-align: center;
  padding: 64px 80px;
  justify-content: center;
}
section.headline-slide h1 { display: none; }
.headline {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.15;
  margin: 24px 0 40px;
}
.headline em {
  color: var(--elastic-teal);
  font-style: italic;
}
.takeaways {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 880px;
  margin: 0 auto;
  text-align: left;
}
.takeaway {
  font-size: 21px;
  padding: 6px 0 6px 22px;
  border-left: 4px solid var(--elastic-teal);
}
.takeaway b { color: var(--elastic-teal); }
.principle {
  margin-top: 36px;
  font-size: 19px;
  color: var(--muted);
  font-style: italic;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

/* ===== Footer note (small caption below content) ===== */
.footer-note {
  margin-top: 14px;
  font-size: 15px;
  color: var(--muted);
  font-style: italic;
  text-align: center;
  padding: 0 30px;
}
</style>

# Real-PR proof
## Two from our backlog

- Same skill: `/dex-review-code`
- Same code, two clones — the only difference is the `.agents/domains/` folder
- Four PRs reviewed; we'll walk two

<div class="cards">
  <div class="card card-highlight">
    <span class="card-star">⭐</span><strong>#271722</strong><br/>
    <code>rulesClient.bulkCreate()</code>
  </div>
  <div class="card card-highlight">
    <span class="card-star">⭐</span><strong>#272038</strong><br/>
    Move install/upgrade/revert into <code>DetectionRulesClient</code>
  </div>
  <div class="card card-muted">
    <strong>#268165</strong><br/>
    Refine rules <code>_search</code>, <code>_review</code> API contracts
  </div>
  <div class="card card-muted">
    <strong>#269617</strong><br/>
    MVP UI for rule changes history
  </div>
</div>

---

<!-- _class: pr-row -->

# #271722 — `rulesClient.bulkCreate()`
## Bulk rule creation in the alerting layer

<div class="two-col">
  <div class="col-generic">
    <div class="col-label">🤨 Generic</div>
    <div class="col-file">route.ts</div>
    <img src="demo-pr-271722-comment-1-generic.png" alt="Generic review comment flagging routeLimitedConcurrencyTag(1) as too aggressive" />
  </div>
  <div class="col-domain">
    <div class="col-label">🎯 Domain-aware</div>
    <div class="col-file">constants.ts</div>
    <img src="demo-pr-271722-comment-1-domain.png" alt="Domain-aware review comment citing heavy-endpoints rate-limit invariant and MSSP 300-spaces scale" />
  </div>
</div>

<div class="footer-note">Same architectural decision. Generic: <em>"aggressive, raise it."</em>  Domain-aware: <em>scale constraint + bounded fix (3–5, not 1).</em></div>

---

<!-- _class: pr-row-stacked -->

# #272038 — Move install/upgrade/revert into `DetectionRulesClient`
## Parity at the surface, delta beneath

<div class="two-col">
  <div class="col-generic">
    <div class="col-label">🤨 Generic</div>
    <div class="col-file">legacy_create_prepackaged_rules.ts</div>
    <img src="demo-pr-272038-comment-1-generic.png" alt="Generic review comment flagging DRC bypass on upgrade step" />
  </div>
  <div class="col-domain">
    <div class="col-label">🎯 Domain-aware</div>
    <div class="col-file">legacy_create_prepackaged_rules.ts</div>
    <img src="demo-pr-272038-comment-1-domain.png" alt="Domain-aware review with same parity catch: install through DRC, upgrade bypasses it" />
  </div>
</div>

<div class="two-col">
  <div class="col-generic col-empty">(no analog — generic has no vocabulary for this)</div>
  <div class="col-domain">
    <div class="col-label">🎯 Domain-aware</div>
    <div class="col-file">detection_rules_client_interface.ts</div>
    <img src="demo-pr-272038-comment-2-domain.png" alt="Domain-aware comment on abstraction-boundary leakage of RuleUpgradeContext through IDetectionRulesClient" />
  </div>
</div>

<div class="footer-note">Both caught the obvious DRC bypass. Only domain-aware noticed the public interface leaking a sibling-domain handler-level type.</div>

---

# How domain discovery works

<div class="flow">
  <div class="flow-step">
    <div class="flow-box"><strong>git diff</strong><br/>vs <code>origin/main</code></div>
    <div class="flow-caption">Diff your branch</div>
  </div>
  <div class="flow-arrow">▶</div>
  <div class="flow-step">
    <div class="flow-box"><strong>matched paths</strong><br/>∩ registered domains</div>
    <div class="flow-caption">Intersect with registered domains</div>
  </div>
  <div class="flow-arrow">▶</div>
  <div class="flow-step">
    <div class="flow-box"><strong>loaded domain</strong><br/><code>domain.json</code><br/>+ <code>.md</code> files</div>
    <div class="flow-caption">Load the matching knowledge</div>
  </div>
  <div class="flow-arrow">▶</div>
  <div class="flow-step">
    <div class="flow-box"><strong>reviewer subagent</strong><br/>comments tagged<br/>with invariants</div>
    <div class="flow-caption">Emit invariant-tagged comments</div>
  </div>
</div>

<div class="footer-note">Same model in both terminals. No fine-tuning. <strong>Only the loaded context differs.</strong></div>

---

# Anatomy of a domain knowledge file

<div class="anatomy">
  <div>
    <div class="col-label">📄 domain.json</div>
<pre><code>{
  "slug": "detection-...",
  "name": "Rule Management",
  "owners": [...],
  "paths": [
    "x-pack/.../rule_management/**"
  ],
  "knowledge_files": [
    "detection-rule-management.md"
  ]
}</code></pre>
  </div>
  <div>
    <div class="col-label">📄 detection-rule-management.md</div>
<pre><code># Overview
&nbsp;&nbsp;&nbsp;· What the domain is
# Architectural invariants
&nbsp;&nbsp;&nbsp;· The boundaries that must not break
# Common review patterns
&nbsp;&nbsp;&nbsp;· Recurring catches per area
# Security considerations
&nbsp;&nbsp;&nbsp;· RBAC, space isolation, sanitization
# Performance constraints
&nbsp;&nbsp;&nbsp;· Scale, throughput, latency
# Historical catches
&nbsp;&nbsp;&nbsp;· Lessons from past PRs</code></pre>
  </div>
</div>

<div class="footer-note">Captured with <code>/dex-domain-capture</code> — 30–60 min one-time, then it pays off on every review.</div>

---

<!-- _class: headline-slide -->

# (hidden)

<div class="headline">Smart is not the same as <em>informed</em>.</div>

<div class="takeaways">
  <div class="takeaway"><b>The abstraction</b> — The model doesn't know that <code>IDetectionRulesClient</code> is <strong>the</strong> boundary in our domain.</div>
  <div class="takeaway"><b>The history</b> — It doesn't know we got burned by an <code>as</code>-cast on <code>lastRunStatus</code> in PR #262307.</div>
  <div class="takeaway"><b>The scale</b> — It doesn't know MSSP customers run 300 spaces × 10,000 rules per space.</div>
</div>

<div class="principle">AI dev automation is as good as the quality and accuracy of the information you put in the context window.</div>
