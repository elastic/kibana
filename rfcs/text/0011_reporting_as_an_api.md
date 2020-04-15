- Start Date: 2020-04-14
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

## TL;DR

The reporting team wishes to eject page-specific code (Dashboard and Discover) _out_ of reporting and into their respective apps. Reporting will, henceforth, operate solely as a REST API wherein application-owners can submit reporting jobs via an API call. We'll continue to maintain the pipeline, security fixes, chromium updates/releases, and the support the administration pages.

**END TL;DR**

The reporting functionality that currently exists in Kibana was originally purpose-built for the Discover, Dashboard and Canvas applications. Because of this, reportings underlying technologies and infrastructure are hard to improve upon, and make generally available for pages across Kibana. Currently, the two-person team has to:

- Build and maintain our own Chromium binary for the 3 main operating systems we support.
- Fix and help troubleshoot issues encountered by our users and their complex deployment topologies.
- Ensure operation in our small-sized cloud deployments.
- Help other teams get their applications “reportable”.
- Continue to adapt changes in Discover and Dashboard so that they can be reportable (WebGL for instance).

In order to ensure the reporting works in a secure manner, we also maintain complex logic that ensures nothing goes wrong during report generation. These include:

- Home-rolled security role checks.
- A custom-built network firewall via puppeteer to ensure chromium can’t be hijacked for nefarious purposes.
- Network request interception to apply authorization contexts.
- Configuration checks for both Elasticsearch and Kibana, to ensure the user's configuration is valid and workable.
- CSV formula injection checks.
- Just CSVs in general are tough to do right...

While we understand that many of these requirements are similar across teams, however, in order to better serve the application teams that depend on reporting the time has come to rethink reportings role inside of Kibana, and how we can scale it across our product suite.

# Basic example

Instead of the following `cURL` (copied from Kibana and truncated for brevity sake)

```sh
curl -x POST http://localhost:5601/api/reporting/generate/printablePdf?jobParams=%28browserTimezone%3AAmerica%2FLos_Angeles%2Clayout...
```

Reporting, instead, would offer a JSON-based POST API:

```sh
curl -x POST http://localhost:5601/api/reporting/pdf
{
  “baseUrl”: “/my/kibana/page/route?foo=bar&reporting=true”,
  "waitUntil": {
    "eventFired": “complete”,
  },
  “viewport”: {
    “width”: 1920,
    “height”: 1080,
    "scale": 1
  }
}
```

This API would, in turn, respond back with a JSON body. The body itself would simply return back an identifier to query for further status information:

```json
{
  "status": "ok",
  "jobId": "123"
}
```

Further information can be found via GET call with the job's ID:

```sh
curl http://localhost:5601/api/reporting/status/123
```

# Motivation

Why are we doing this? What use cases does it support? What is the expected
outcome?

Please focus on explaining the motivation so that if this RFC is not accepted,
the motivation could be used to develop alternative solutions. In other words,
enumerate the constraints you are trying to solve without coupling them too
closely to the solution you have in mind.

# Detailed design

This is the bulk of the RFC. Explain the design in enough detail for somebody
familiar with Kibana to understand, and for somebody familiar with the
implementation to implement. This should get into specifics and corner-cases,
and include examples of how the feature is used. Any new terminology should be
defined here.

# Drawbacks

Why should we *not* do this? Please consider:

- implementation cost, both in term of code size and complexity
- the impact on teaching people Kibana development
- integration of this feature with other existing and planned features
- cost of migrating existing Kibana plugins (is it a breaking change?)

There are tradeoffs to choosing any path. Attempt to identify them here.

# Alternatives

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

Optional, but suggested for first drafts. What parts of the design are still
TBD?