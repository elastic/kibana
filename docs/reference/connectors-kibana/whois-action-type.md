---
navigation_title: "WHOIS"
type: reference
description: "Use the WHOIS connector to enrich a domain or address indicator during triage: look up registration records for domains, IP addresses, ASNs, nameservers, and registry contacts over RDAP."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# WHOIS connector [whois-action-type]

The WHOIS connector gives a workflow or agent registration facts about an indicator without a hand-built HTTP call. Point it at a domain and it returns the registrar, registration and expiry dates, nameservers, status codes, and whatever contacts the registry publishes. Point it at an IP address or ASN and it returns the owning organization, the netblock, the country, and the abuse contact. This is the enrichment step behind phishing and IOC triage, where a domain registered three days ago or a suspect netblock owner changes how an alert gets handled.

## Overview

This is a **custom connector** that speaks [RDAP](https://www.rfc-editor.org/rfc/rfc9083), the Registration Data Access Protocol, over HTTPS.

RDAP is the IETF's replacement for the classic WHOIS protocol and returns structured JSON rather than free text. It is the only viable transport here: legacy WHOIS runs as a plain-text protocol on TCP port 43, which {{kib}} connectors cannot reach because they speak HTTP through an HTTP client only, and {{kib}} egress typically blocks raw TCP anyway.

By default every lookup goes to `https://rdap.org`, an aggregating bootstrap service that redirects each query to the authoritative registry. You can point the connector at a single registry server instead, or at a commercial RDAP gateway that requires an API key.

Every action is a read, so all of them are available both as workflow steps and as agent tools.

### RDAP coverage [whois-rdap-coverage]

RDAP coverage is broad but not universal, and this shapes what the connector can answer:

* **Covered**: every gTLD (`.com`, `.net`, `.org`, `.dev`, `.xyz`, and roughly 1,200 others in the IANA bootstrap registry), and all five regional internet registries (ARIN, RIPE NCC, APNIC, LACNIC, AFRINIC) for IP addresses and ASNs.
* **Not covered**: many country-code TLDs never adopted RDAP, including `.co`, `.io`, `.de`, `.ru`, and `.cn`. A lookup for one of these returns a not-found result rather than data.

There is no fallback for an uncovered TLD, because port-43 WHOIS is unreachable from {{kib}}.

## Create connectors in {{kib}} [define-whois-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [whois-connector-configuration]

WHOIS connectors have the following configuration properties:

RDAP server URL
:   The base URL every lookup is sent to. Defaults to `https://rdap.org`. Must use HTTPS. Set it to a specific registry server, such as `https://rdap.verisign.com/com/v1` for `.com` domains or `https://rdap.arin.net/registry` for North American IP space, to skip the bootstrap redirect. Set it to your provider's URL to use a commercial RDAP gateway.

Authentication
:   Choose **No authentication (public RDAP)**, the default, since public RDAP requires no credential. Choose **API key header** only for a commercial or private RDAP gateway that requires one, and enter both the header name your gateway expects, for example `Authorization` or `X-Api-Key`, and the key itself. The key is stored encrypted.

::::{note}
The default `https://rdap.org` endpoint answers with an HTTP redirect to the authoritative registry host, so a lookup touches two hosts. If your deployment restricts outbound connections with the `xpack.actions.allowedHosts` setting, allow the registry hosts you expect to reach as well as `rdap.org`, or configure a single registry server as the RDAP server URL and allow just that host.
::::

## Connector actions [whois-connector-actions]

`lookupDomain`
:   Looks up a domain's registration record. Returns the registrar with its IANA ID, the registration, expiry, and last-changed dates, a precomputed age in days and days until expiry, EPP status codes, nameservers with any glue addresses, DNSSEC delegation state, and the registrant and abuse contacts the registry publishes. The primary enrichment step in phishing triage.

`lookupIp`
:   Looks up the registration record for an IPv4 or IPv6 address, or a CIDR block. Returns the owning organization, the netblock in CIDR form plus its start and end addresses, the allocation type, the AS numbers announcing it, and the abuse contact. Any address inside an allocation returns that whole allocation.

`lookupAsn`
:   Looks up an autonomous system number, with or without the `AS` prefix. Returns the AS name, the allocated range, the holding organization, country, and the abuse contact. Use it after `lookupIp` to identify the network announcing a suspect address.

`lookupNameserver`
:   Looks up a nameserver host object. Returns its registered glue IP addresses and status. Use it to pivot from a suspicious domain to the infrastructure behind its delegation.

`lookupEntity`
:   Looks up a contact or organization by its registry-assigned RDAP handle. Returns the name, organization, email, phone, address, country, roles, and any child contacts. Use it to expand a handle another lookup returned only as an identifier.

## Usage notes [whois-usage-notes]

* **A not-found result is data, not an error.** Every action returns a result with `found: false` instead of failing when the registry answers with HTTP 404, so a workflow can branch on "no record" without the run failing. RDAP cannot distinguish three cases behind that 404: the object is genuinely unregistered or unallocated, the registry operates no RDAP service, or the query was malformed. Check the `found` field rather than relying on an error.
* **Responses are trimmed.** RDAP records are large and mostly boilerplate: terms-of-service notices, status-code glossaries, and self-referencing link arrays often make up half the payload, and a single IP record can exceed 6 KB. Each action returns only the triage-relevant fields. Set `includeRaw` to `true` to also receive the full unparsed record, but only when a field you need is genuinely missing, since the raw records will crowd out an agent's context.
* **Query the registrable apex.** A subdomain is not registered, so `lookupDomain` on `mail.example.com` returns a not-found result. Query `example.com`.
* **Punycode internationalized names first.** RDAP addresses an internationalized domain by its ASCII A-label, so pass `xn--80ak6aa92e.com` rather than the Unicode form.
* **Registrant identity is usually redacted.** Most registries return `REDACTED FOR PRIVACY` in place of the registrant name and email while still publishing the registrar, dates, nameservers, and status. A missing registrant is normal and is not itself a suspicious signal.
* **Handles are registry-scoped.** An entity handle returned by an IP lookup only resolves at the registry that issued it. Pass that registry as the per-call base URL when you look the handle up, for example `https://rdap.arin.net/registry` for an ARIN handle such as `GOGL`.
* **Every action accepts a per-call base URL** that overrides the connector default, so one connector can query several registries directly. If you use the API key header authentication type, keep `xpack.actions.allowedHosts` restricted to your gateway: the key is sent to whichever host a call targets, and the default `https://rdap.org` configuration needs no credential at all.
* **Registries differ on which fields they publish.** RIPE NCC and APNIC return a top-level ISO `country` code for an address; ARIN does not publish one, so for North American address space `country` is absent and the holder's location arrives as a postal address in `organization.address` instead. Do not read a missing `country` as a signal, and do not compare it across registries. Similarly, the `originAutnums` field naming the announcing AS is an ARIN extension and is often empty even at ARIN, so get the AS from `lookupAsn` or another tool rather than assuming an empty array means the address is unannounced.
* **Respect registry rate limits.** Public RDAP servers rate-limit by IP address and return HTTP 429 under a burst of lookups. Space out a batch of enrichment calls.

## Get API credentials [whois-api-credentials]

The WHOIS connector needs **no credentials** in its default configuration. Public RDAP is an unauthenticated protocol, so you can create the connector with **No authentication** selected and every action works against public registry data.

You only need a credential to route lookups through a commercial RDAP gateway for parsed extras or higher rate limits:

1. Create an account with your RDAP provider and generate an API key.
2. Check the provider's documentation for the header name it expects, for example `Authorization` or `X-Api-Key`.
3. When you create the connector in {{kib}}, choose **API key header** as the authentication type, enter that header name and your key, and set the RDAP server URL to your provider's HTTPS endpoint.
