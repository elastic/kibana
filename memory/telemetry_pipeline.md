---
name: Telemetry pipeline at Elastic
description: How EBT events flow from Kibana to BigQuery to Looker dashboards; SIEM Readiness telemetry status and SDA team coordination
type: project
---

Elastic's telemetry pipeline has two paths:

1. **Elasticsearch** — raw EBT events indexed for fast, near-real-time exploration (dev: `kibana-ebt-browser`, prod: internal ES cluster)
2. **BigQuery** — Bronze → Silver → Gold pipeline for historical, cross-domain, business analytics
   - Bronze: raw dump, e.g. `elastic-security-prod.bronze_raw_docs.kibana-server`
   - Silver: cleaned/filtered, e.g. `silver_ebt_entity_store_usage`
   - Gold: enriched + joined with business data, e.g. `elastic-security-prod.elastic_security_telemetry.gold_entity_store_usage`
   - Consumed via LookerStudio / SQL / Evidence

**Why:** Fast dev iteration uses ES; company-scale decisions (customer trends, subscriptions, 30-day rollups) use BQ.

**SIEM Readiness telemetry status (as of 2026-04-23):**
- Events added in PR [elastic/kibana#264612](https://github.com/elastic/kibana/pull/264612) — tab visits, integration clicks, rule view toggles, integration popover opens
- No dashboard exists yet — Andrey's team (SDA) will build Silver/Gold BQ tables and Looker dashboards once events are in prod
- **Action needed:** assign a dedicated engineer from the team to coordinate with SDA on building the Silver/Gold layers

**Why:** PM Smriti confirmed no SIEM Readiness dashboard exists yet; SDA team is ready to pair once the PR merges and data flows into BigQuery.
**How to apply:** When asked about querying SIEM Readiness telemetry in production, point to BigQuery Gold table (not yet built) and the SDA team coordination requirement.
