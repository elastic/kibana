<!-- flow: Entity Analytics — page render and risk score panels | started: 2026-06-02T04:45:40Z | ended: 2026-06-02T04:47:30Z | duration: 1m 50s -->

## Finding: entity_store/install returns 500 on Entity Analytics page load

**Level:** 1
**Flow:** Entity Analytics — page render and risk score panels
**Role:** editor+t2_analyst (cloud SAML)
**Checklist step:** 1 — Happy path

### Steps followed
1. Navigated to `/s/exploratory-testing/app/security/entity_analytics`
2. Page loaded, Detector B applied to console errors

### Current behavior
`POST /api/security/entity_store/install → 500` appears in the console on page load. The call is triggered automatically without any user action — Kibana attempts to install the entity store when the Entity Analytics page opens.

### Expected behavior
Per spec at `https://www.elastic.co/docs/solutions/security/advanced-entity-analytics`: the Entity Analytics page should be accessible before the entity store is enabled. The docs describe an "Enable the entity store" action as a deliberate user step. An automatic install attempt that returns 500 on page load contradicts this — the page should render in a pre-enabled state (showing risk scores and anomalies with limited graph functionality) without triggering a background install call that fails.

### Why this might be an issue
An automatic 500 on page load is a regression signal: it fires before the user does anything, so users who haven't explicitly enabled the entity store will see a silent failure every time they visit Entity Analytics. This could mask subsequent entity store errors and creates unnecessary server-side noise.

### Evidence
- Console: `Failed to load resource: 500 @ /api/security/entity_store/install`
- Network: `POST /api/security/entity_store/install → 500`

---

## Finding: POST /api/security_solution/initialize called 2× per navigation — systemic

**Level:** 2
**Flow:** Entity Analytics — page render and risk score panels
**Role:** editor+t2_analyst (cloud SAML)
**Checklist step:** 1 — Happy path — mini-probe

### Steps followed
1. Detected duplicate `POST /api/security_solution/initialize` on Entity Analytics page load (Detector C)
2. Mini-probe: navigated to `/app/security/hosts/allHosts` to check if this is page-specific

### Current behavior
`POST /api/security_solution/initialize` fires **2× on every Security Solution page load**, confirmed on both Entity Analytics and Hosts. Not page-specific — systemic across the Security Solution app.

### Expected behavior
Per spec at `https://www.elastic.co/docs/solutions/security/advanced-entity-analytics` (and standard HTTP semantics): a single initialization call per navigation is expected. Duplicate calls with identical payloads on the same page load suggest a component re-mounting or double-render issue.

### Why this might be an issue
Double initialization calls waste server resources on every navigation and may indicate a React component lifecycle issue (unmount/remount cycle). At scale (many users, frequent navigation) this doubles the load on the initialize endpoint.

### Evidence
- Network: `POST /api/security_solution/initialize → 200` × 2 on Entity Analytics page load
- Network: `POST /api/security_solution/initialize → 200` × 2 on Hosts page load (mini-probe)
- Mini-probe conclusion: **systemic across Security Solution pages, not page-specific**

---

## Finding: GET /internal/entity_analytics/leads/privileges called 2× on Entity Analytics load

**Level:** 2
**Flow:** Entity Analytics — page render and risk score panels
**Role:** editor+t2_analyst (cloud SAML)
**Checklist step:** 1 — Happy path

### Steps followed
1. Detector C applied to network requests on Entity Analytics page load

### Current behavior
`GET /internal/entity_analytics/leads/privileges` fires **2×** on a single page load (requests 337 and 345).

### Expected behavior
Per spec at `https://www.elastic.co/docs/solutions/security/advanced-entity-analytics`: a single privilege check per page load is expected.

### Why this might be an issue
Duplicate privilege checks on every Entity Analytics load indicate a component re-mounting issue specific to the leads feature area.

### Evidence
- Network: `GET /internal/entity_analytics/leads/privileges → 200` × 2

---

## Observation: formatjs UNCLOSED_TAG errors in entityStore bundle

**Level:** 3
**Flow:** Entity Analytics — page render and risk score panels
**Role:** editor+t2_analyst (cloud SAML)
**Checklist step:** 1 — Happy path

### Current behavior
Two `[@formatjs/intl Error FORMAT_ERROR] UNCLOSED_TAG SyntaxError` errors from `entityStore.chunk.620.js` on page load. Affect i18n message keys `xpack.streamlang.actionMetadata.uriParts.usage` and `xpack.streamlang.actionMetadata.uriParts.tips.keepOriginal` — both contain angle brackets (`<prefix>`) that formatjs treats as unclosed tags.

### Evidence
- Console: `Error: [@formatjs/intl Error FORMAT_ERROR]...UNCLOSED_TAG SyntaxError @ entityStore.chunk.620.js`

---

## Observation: /internal/cps/project_routing/kibana_space_exploratory-testing_default → 404

**Level:** 3
**Flow:** Entity Analytics — page render and risk score panels
**Role:** editor+t2_analyst (cloud SAML)
**Checklist step:** 1 — Happy path

### Current behavior
`GET /internal/cps/project_routing/kibana_space_exploratory-testing_default → 404`. CPS (Cloud Proxy Service) routing endpoint not found for the custom space — expected on QA serverless environments using non-default spaces.

### Evidence
- Console: `Failed to load resource: 404 @ /internal/cps/project_routing/kibana_space_exploratory-testing_default`
