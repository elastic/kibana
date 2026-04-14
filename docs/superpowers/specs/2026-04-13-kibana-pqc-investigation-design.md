# Kibana post-quantum cryptography (PQC) investigation — design spec

**Date:** 2026-04-13  
**Status:** Approved for investigation work (design); product changes are out of scope until a separate implementation plan exists.  
**Scope:** **B** — Kibana (this repository) plus Elasticsearch **at public contract / integration level** only (no Elasticsearch codebase audit unless an unblocker requires it).

## 1. Purpose

Elastic InfoSec and engineering need a **accurate, evidence-based** picture of:

1. What **post-quantum principles** mean in practice for a product like Kibana.
2. **Where cryptography appears** in Kibana and adjacent Elasticsearch interactions.
3. **What must change inside Kibana** versus **what depends on external systems** (Node/OpenSSL, Elasticsearch, reverse proxies, browsers, customer PKI).
4. How **PKI authentication** and **TLS 1.2 vs TLS 1.3** relate to PQC roadmaps (including why they are mostly **orthogonal** but still **operationally** relevant).

This document defines the **investigation** to produce that picture. It does not mandate specific algorithm choices or ship dates.

## 2. Background and references

- **PQC overview:** [Post-quantum cryptography (Wikipedia)](https://en.wikipedia.org/wiki/Post-quantum_cryptography) — general definitions; verify claims against NIST and vendor primary sources.
- **NIST program:** [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography) — standardized KEMs and signatures (e.g. ML-KEM / FIPS 203 context).
- **Industry urgency example:** [Google’s timeline for PQC migration](https://blog.google/innovation-and-ai/technology/safety-security/cryptography-migration-timeline) (2026-03-25) — states a **2029** migration target, **store-now-decrypt-later** for encryption, and reprioritization toward **authentication / digital signatures** in their threat model. Use as **context**, not as Elastic’s committed timeline.

## 3. Post-quantum principles (investigation framing)

The investigation shall explain these themes in plain language and tie each to concrete Kibana or stack surfaces:

| Principle | Short meaning | Typical product touchpoints |
|-----------|----------------|-----------------------------|
| **Threat model** | Long-lived ciphertext may be recorded today and broken later (harvest-now-decrypt-later). Signatures and long-lived trust may face a future CRQC. | TLS recordings, backups, session stores, encrypted saved objects, audit logs. |
| **Standardized algorithms** | Prefer NIST-standardized PQ primitives over ad hoc designs. | Depends on TLS stack and libraries, not Kibana-authored ciphers. |
| **Hybrid transition** | Combine classical and PQ (especially TLS key agreement) during migration. | TLS 1.3 client/server capabilities in Node/OpenSSL and proxies. |
| **Crypto agility** | Ability to rotate algorithms, cert types, trust stores, and config without catastrophic coupling. | `kibana.yml`, keystores, Fleet policies, release notes, upgrade paths. |
| **Scope beyond TLS** | X.509, tokens, application encryption, integrations. | PKI realm, OIDC/SAML, session crypto, ESO, connectors. |

**Accuracy rule:** Any statement about algorithm availability (e.g. “Node X negotiates group Y”) must be **verified** against release notes or a lab repro, not assumed.

## 4. Scope boundaries

### 4.1 In scope

- **Kibana codebase and configuration:** inbound HTTPS/HTTP2, SSL schema, Elasticsearch client TLS, Security (sessions, PKI provider), encrypted saved objects and related packages, connectors and other **documented** outbound HTTPS patterns (inventory).
- **Elasticsearch at contract level:** HTTP APIs and configuration concepts Kibana uses (e.g. security delegate PKI, TLS verification semantics for the cluster client). Cite **public** Elasticsearch documentation or REST contracts. If the investigation needs implementation detail, **escalate** as a finding rather than deep-diving ES source by default.

### 4.2 Out of scope (unless blocking)

- Elasticsearch JVM crypto implementation details.
- Elastic Agent binary internals (except **Kibana-authored configuration** delivered to agents, if those configs materially affect TLS or crypto posture and are part of customer-facing “Kibana product” surface).
- Third-party vendor roadmaps beyond what is needed to explain Kibana’s integration point.

## 5. Investigation method: matrix-first

Produce a single master artifact (spreadsheet or markdown table) with at least these columns:

| Column | Description |
|--------|-------------|
| **Facet** | Name of the surface (e.g. inbound TLS, ES client TLS, PKI auth). |
| **Control** | What can be tuned (config key, code path, env). |
| **Owner** | Kibana / Elasticsearch / customer infrastructure. |
| **Evidence** | File path, setting name, doc URL, or API path. |
| **PQ relevance** | KEM (key agreement), signature, symmetric strength, agility only, or not PQ-relevant. |
| **Gaps / questions** | Unknowns and recommended follow-up owner. |

Recommended narrative order: principles → matrix summary → deep dives on high-risk rows (TLS, PKI, long-lived ciphertext).

## 6. Kibana facets to inventory (starting checklist)

These are **starting rows** for the matrix; the investigation completes the table and adds missing facets.

1. **Inbound server TLS** — `kbn-server-http-tools` (`SslConfig`, `getServerTLSOptions`, listeners). Protocols, cipher suites, client authentication (`requestCert` / `rejectUnauthorized`).
2. **Outbound Elasticsearch** — `@elastic/elasticsearch` client configuration (`parseClientOptions`, `generateSslConfig`), including verification modes and optional client certificates.
3. **PKI authentication (Security)** — `PKIAuthenticationProvider`: certificate chain extraction, `/_security/delegate_pki`, interaction with TLS 1.3 (no renegotiation).
4. **Session and cookie encryption** — `xpack.security.encryptionKey`, session index encryption, cookie storage factory.
5. **Encrypted saved objects and secrets** — dedicated packages and migrations; algorithm and key handling per existing Elastic guidance.
6. **Integrations** — Stack connectors, webhooks, Fleet-related TLS configuration surfaces, Synthetics (and similar) where Kibana emits TLS-related policy for other runtimes.
7. **Build/runtime** — Node version pinned for Kibana (e.g. root `package.json` `engines.node`), and how Elastic distribution bundles OpenSSL (verify in build docs or release artifacts).

## 7. PKI authentication and TLS 1.3 vs PQC (required subsection)

**Document the following facts for InfoSec:**

1. **TLS 1.3 does not support renegotiation.** Kibana’s public socket contract states this explicitly (`IKibanaSocket.renegotiate`).
2. **PKI provider** only uses `renegotiate` when the negotiated protocol is in `TLSv1`, `TLSv1.1`, or `TLSv1.2`, to recover from **incomplete client certificate chains**. For `TLSv1.3`, it logs that renegotiation is not possible and may fail authentication if the chain is incomplete.
3. **Therefore:** Guidance to prefer **TLS 1.2** for some PKI deployments addresses **certificate chain delivery and renegotiation**, not a requirement of post-quantum algorithms.
4. **PQ interaction:** Industry PQ **hybrid key exchange** for HTTPS is predominantly rolled out on **TLS 1.3** paths. Customers pinned to TLS 1.2 for PKI may **lag** desired PQ-hybrid negotiation until they fix chain presentation (or Kibana/flow changes remove the renegotiation dependency). This is a **roadmap and operations** concern, not “PQ breaks PKI.”
5. **Durable direction:** Operational fix = clients present a **complete chain** (or trust stores include intermediates) so TLS 1.3 works with PKI; plus verify **Node/OpenSSL** in the shipped Kibana for desired PQ groups when available.

Code references for the written investigation report (paths relative to repository root):

- `x-pack/platform/plugins/shared/security/server/authentication/providers/pki.ts` — `RENEGOTIABLE_PROTOCOLS`, `getCertificateChain`.
- `src/core/packages/http/server/src/router/socket.ts` — `renegotiate` documentation.
- `src/platform/packages/shared/kbn-server-http-tools/src/ssl/ssl_config.ts` — `supportedProtocols` defaults.
- `src/platform/packages/shared/kbn-server-http-tools/src/get_tls_options.ts` — TLS options passed to Node.

## 8. External and environmental dependencies

The investigation must list and, where possible, verify:

| Dependency | Why it matters for PQC |
|------------|-------------------------|
| **Node.js + OpenSSL (as shipped by Elastic)** | Controls negotiated TLS 1.3 groups, library support for ML-KEM / hybrids, and `crypto` primitives. |
| **Elasticsearch cluster** | TLS to cluster; PKI realm and delegate PKI API; future stack-wide PQ policy. |
| **Reverse proxies / LBs** | May terminate TLS with different PQ or TLS 1.3 behavior than Node. |
| **Browsers and corporate TLS inspection** | Client-side PQ hybrid support and middlebox compatibility. |
| **Customer PKI and HSM practices** | Cert chain completeness, algorithm choices for issuing CAs, migration to PQ signatures on certificates (industry timeline). |

## 9. Deliverables

1. **Investigation report** (separate artifact from this spec; format TBD by team — Confluence, Google Doc, or internal wiki) containing: executive summary, matrix, PKI/TLS subsection, ES contract subsection, prioritized gaps, and recommended owners.
2. **Optional appendix:** Lab commands or scripts to confirm negotiated TLS groups against a running Kibana build (no requirement to commit scripts in this phase).

## 10. Success criteria

- No **unverified** claims about which PQ algorithms or TLS groups Kibana negotiates today.
- Clear separation: **Kibana-owned** vs **Elasticsearch** vs **customer environment**.
- PKI / TLS 1.3 section is present and matches code behavior described in section 7.
- Gap list with **one accountable follow-up** per critical gap (team or role, not “someone”).

## 11. Out of scope for follow-on “implementation plan” until explicitly requested

Product code changes, new `kibana.yml` knobs, or dependency bumps are **not** part of this investigation spec. After this spec is reviewed, the next step is a separate **implementation plan** (per team process), not automatic engineering work.

## 12. Self-review (completed at authoring)

- **Placeholders:** None intentional; “separate artifact” is deliberate.
- **Consistency:** Scope B is consistent with matrix and ES contract level.
- **Ambiguity:** “Elasticsearch at contract level” means public REST APIs and documented settings, not source dive unless escalated.
- **Scope:** Single investigation; not a multi-year Elastic-wide PQC program plan.
