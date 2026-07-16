# BlackHat 2026 Demo Plan — Agentic XDR (Forensic → Hunt → Response)

> Source of truth for demo requirements: `elastic/security-team#18187` (Raquel).
> Goal: a single AI Agent chat takes an analyst from ransomware alert → forensic reconstruction → cross-environment IoC hunt → HITL-gated containment, with **zero manual pivoting** outside the chat.

---

## 1. The 12 requirements (mapped from issue #18187)

| # | Requirement (from narrative + success criteria) | Phase | Covered by |
|---|---|---|---|
| 1 | Endpoint context & telemetry inventory (Defend + Osquery) | 1 Forensic | skill prompt step 1 |
| 2 | Root-cause reconstruction (initial access, process lineage) | 1 Forensic | `extract_iocs` + ES\|QL timeline |
| 3 | Identify ransomware binary, hash, first execution | 1 Forensic | `extract_iocs` hash row |
| 4 | Confirm shadow-copy deletion (`vssadmin`) | 1 Forensic | kill-chain event + timeline |
| 5 | Detect file encryption activity (`.locked` ext) | 1 Forensic | `extract_iocs` extension row |
| 6 | **IoC extraction: hash, C2, mutex, registry, extension** | 1 Forensic | `extract_iocs` + osquery mutex guidance |
| 7 | Human-readable attack timeline | 1 Forensic | timeline reconstruction |
| 8 | Agent **proactively asks** before cross-env hunt | 1→2 handoff | forensic skill handoff prompt |
| 9 | Cross-env hunt finds ≥1 additional compromised host | 2 Hunt | threat-hunting skill |
| 10 | Agent surfaces containment recs (scan + isolate) before acting | 2→3 handoff | threat-hunting → response handoff |
| 11 | **Sequential HITL** confirmation per host per action | 3 Response | response skill sequential guidance |
| 12 | Closing incident summary | 3 Response | response skill step 4 |

---

## 2. Demo dataset — what to seed

### 2a. Reuse existing eval seed (`forensic_data.ts`)

The existing kill chain already covers reqs 1–5, 7 for two hosts. Hosts:
- `WKSTN-RECV01` — patient zero (phishing → encoded PowerShell → `update.dll` → C2 beacon → lateral SMB/WMI)
- `SRV-DC01` — lateral target (WMI exec → Run-key persistence → `vssadmin delete shadows` → `.locked` files → ransom note)

Existing IoCs the agent will extract: SHA-256 `a3f5…2a10`, C2 `185.220.101.42:443`, Run-key `HKLM\…\Run\Updater → svc.exe`, `.locked` extension.

### 2b. Dataset gaps to close for the demo (reqs 6, 9)

| Gap | Why it's missing | Fix |
|---|---|---|
| **Mutex IoC** (req 6) | No Defend-telemetry mutex field | Seed nothing in ES; the agent runs `osquery.run_live_query` (`winbaseobj`, `object_type='Mutant'`) against the live Defend VM → returns `Global\UpdaterMutex` |
| **Third host for hunt** (req 9) | Existing seed has 2 hosts but the hunt must find a *new* host the forensic skill didn't investigate | Add `WIN-FIN-03` seed: same C2 beacon + same hash + same Run-key (partial IoC match → 3 of 5 IoCs) at `+47min` offset |

### 2c. New seed file: `demo_data.ts` (to author)

```
WIN-FIN-03  (lateral/second phish target, +47 min)
  - PROCESS  offset 47  svchost.exe spawns UpdateService.exe (hash a3f5…2a10)
  - NETWORK  offset 48  outbound TLS to 185.220.101.42:443
  - REGISTRY offset 49  Run-key Updater → C:\ProgramData\svc.exe
  - FILE     offset 50  first .locked file
```

Plus a ransomware **alert** document so the demo starts from Alerts (not just raw telemetry):
```
.alerts-security.alerts-default
  signal: ransomware.behavior on WIN-PROD-042 (alias to WKSTN-RECV01 for the live demo)
```

### 2d. Live-host side (Osquery mutex — req 6)

The two enrolled Defend VMs (see §4) must return a named mutex when the agent runs the live query. Either:
- (a) create the mutex on the VM at boot via a tiny scheduled task (`CreateMutex(Global\UpdaterMutex)`), **or**
- (b) rely on a real ransomware-simulator binary the demo detonates T-30min that creates the mutex.

**Recommended: (a)** — deterministic, survives reboots, no malware on the demo VM.

---

## 3. Demo narrative script (what to type, what to show)

| Step | Analyst types (or says) | Agent does | Req shown |
|---|---|---|---|
| 0 | *(open Alerts, click "Investigate with AI Agent")* | Loads alert context | entry |
| 1 | "Investigate this alert. What happened on WIN-PROD-042?" | Step 1: inventories Defend + Osquery sources | 1 |
| 2 | *(agent continues)* | Step 2: ES\|QL timeline → `OUTLOOK → powershell → rundll32 → update.dll` | 2,3,4,7 |
| 3 | *(agent continues)* | Step 3: calls `extract_iocs` → structured table (hash, C2, registry, `.locked`) | 5,6 |
| 4 | *(agent continues)* | Step 4: calls `osquery.run_live_query` winbaseobj → mutex row `Global\UpdaterMutex` | 6 |
| 5 | *(agent asks: "Search other endpoints?")* → "Yes" | Handoff prompt fires | 8 |
| 6 | *(agent runs hunt)* | Cross-env query matches `WIN-FIN-03` (3/5 IoCs) | 9 |
| 7 | *(agent recommends scan + isolate)* → "Yes, proceed" | Recs surfaced | 10 |
| 8 | *(HITL card 1)* → Confirm | Malware scan on WIN-FIN-03 → detects payload | 11 |
| 9 | *(HITL card 2)* → Confirm | Isolate WIN-PROD-042 | 11 |
| 10 | *(HITL card 3)* → Confirm | Isolate WIN-FIN-03 | 11 |
| 11 | *(agent summary)* | Closing incident summary | 12 |

**Talk track per phase:**
- **Phase 1:** "Notice the agent didn't make me leave chat to run Discover or Osquery by hand. It reconstructed the whole chain from the alert."
- **Phase 2:** "The agent *asked* before expanding scope — that's the human-judgement gate. And it found a host I didn't know was infected."
- **Phase 3:** "Every write action is a separate confirmation card — scan, then isolate, then isolate. No batched destructive action. And it closed the loop with a summary."

---

## 4. Infrastructure needed — multi-VM (3 Windows hosts)

This is a **multi-VM demo**: 3 persistent GCP Windows VMs, one per host in the
narrative — not a single-box simulation. This mirrors the RSA 2026 demo's
provisioning shape (`scripts/endpoint/rsa_2026_demo/provisioner.ts`,
`vmType=gcp` path with `gcpVmNames`), which itself provisioned 10 endpoints
(5 Defend+Osquery + 5 Osquery-only) as real GCP VMs and deliberately made the
AI agent **discover** the extra compromised hosts via cross-endpoint Osquery
rather than pre-telling it — the same design principle applies here to
`WIN-FIN-03`.

Existing persistent Defend VMs in `elastic-security-dev`
(`patrykkopycinski-forensics-defend-*`, `patrykkopycinski-respact-defend-*`)
are **Ubuntu** and back the eval-suite slice-1/2 evals — reused as-is, not
replacement for these 3. The BlackHat narrative is Windows-native
(`vssadmin`, domain controller, `.locked` ransomware), so 3 new **Windows
Server 2022** VMs are provisioned specifically for the live demo.

| # | GCP VM name | Windows hostname | Role | Scripts |
|---|---|---|---|---|
| 1 | `blackhat-demo-wkstn-recv01` | `WKSTN-RECV01` | Patient zero — phishing entry, alert source | `provision_windows_vms.sh` |
| 2 | `blackhat-demo-srv-dc01` | `SRV-DC01` | Domain controller — lateral target, shadow-copy deletion, ransom note | `provision_windows_vms.sh` |
| 3 | `blackhat-demo-win-fin-03` | `WIN-FIN-03` | Lateral finance host — **must be found by the hunt**, not pre-investigated | `provision_windows_vms.sh` |

| Resource | Purpose | Provisioning |
|---|---|---|
| Serverless security project (from PR deploy) | Hosts Kibana + the agent + skills | PR #278636 deploy checkbox |
| 3× persistent GCP Windows Server 2022 VMs w/ Elastic Defend + Osquery | Live Osquery mutex source + real isolation targets across 3 hosts | `provision_windows_vms.sh` (this change) |
| Qualys agent on all 3 VMs | Compliance (InfoSec007) — **hard requirement, do not skip** | `install_qualys_windows_vm.sh` (this change, Windows counterpart to `ao-workspace/scripts/install-qualys-gcp-vm.sh`) |
| Anti-reaper labels | `division=engineering,org=security,team=securityengineeringproductivity,project=blackhat-demo` | applied at `gcloud compute instances create` time in `provision_windows_vms.sh` |
| Fleet enrollment into deployed project | All 3 VMs must report to the *deployed* Kibana, not a static one | enroll after deploy URL resolves — see §5 enrollment step |
| Seed data: kill chain (2 hosts) + WIN-FIN-03 + alert | Telemetry for forensic + hunt | `forensic_data.ts` (existing, hosts 1–2) + `demo_data.ts` (this change, host 3 + alert) — seed via `seed_demo_data.ts` against the deployed project |
| Mutex on all 3 VMs | Osquery live-query target (`winbaseobj`, `object_type='Mutant'`) | `create_mutex_task.ps1` (this change) — run once per VM, survives reboot via scheduled task |

### Scripts added for this demo (`scripts/endpoint/blackhat_demo/`)

- `provision_windows_vms.sh` — creates the 3 GCP Windows VMs with anti-reaper labels
- `install_qualys_windows_vm.sh` — Windows Qualys .msi install (mirrors the Linux `.deb` flow in `ao-workspace/scripts/install-qualys-gcp-vm.sh`)
- `create_mutex_task.ps1` — run **on** each VM post-enrollment; schedules the `Global\UpdaterMutex` holder task
- `demo_data.ts` + `seed_demo_data.ts` — seeds `WIN-FIN-03` events + the ransomware alert into the deployed project's ES cluster

---

## 5. Validation checklist (demo-readiness gate)

- [ ] Deployed Kibana URL resolves from deploy-bot comment
- [ ] Both skills visible in Agent Builder (flags = true on this branch)
- [ ] All 3 GCP Windows VMs created (`provision_windows_vms.sh`) with anti-reaper labels
- [ ] Qualys agent active on all 3 VMs (`install_qualys_windows_vm.sh` — InfoSec compliance, do not skip)
- [ ] All 3 hosts enrolled + reporting (Defend green) into the *deployed* project, not a static Kibana
- [ ] Kill-chain seed indexed (verify: ES\|QL `FROM logs-endpoint.events.process-* | WHERE host.name == "WKSTN-RECV01"`)
- [ ] WIN-FIN-03 seed indexed (verify via `seed_demo_data.ts` success log + ES\|QL count)
- [ ] Mutex task running on all 3 VMs (`create_mutex_task.ps1` — verify: manual osquery live query returns `Global\UpdaterMutex`)
- [ ] Phase 1: agent produces timeline + IoC table (5 rows incl. mutex) — reqs 1–7
- [ ] Phase 1→2: agent **asks** before hunt — req 8
- [ ] Phase 2: hunt finds WIN-FIN-03 — req 9
- [ ] Phase 2→3: recs surfaced — req 10
- [ ] Phase 3: 3 sequential HITL cards, all execute — req 11
- [ ] Closing summary — req 12
- [ ] No errors in agent chat; no manual pivots required

---

## 6. Risks / fallbacks

| Risk | Fallback |
|---|---|
| Osquery integration not enrolled in deployed project | Mutex row renders "requires Osquery" — req 6 still partially shown; pre-flight: ensure Osquery integration is enabled |
| VM re-enrollment fails after deploy URL change | Keep a static Fleet server; re-point agents via policy |
| Agent doesn't fire handoff prompt | Have the canned Phase 2 query ready to paste as analyst input |
| HITL cards don't render (UX gap) | This is the known net-new-UX risk — if cards absent, fall back to showing the response skill's action plan as text + manual execution |
| Demo VM reaped | Anti-reaper labels (§4); check VM health T-1hr before |
