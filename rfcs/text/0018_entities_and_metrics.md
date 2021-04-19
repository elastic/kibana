- Start Date: 2021-04-19
- RFC PR: 
- Kibana Issue: 
- Proof of Concept PR: https://github.com/elastic/kibana/pull/96446

# Summary (Draft)

The feature uses [ES transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html) to provide visualizations that would be ineffective if implemented using existing Kibana techniques.

# Basic example

TODO

# Motivation

Users of the Security Solution are experiencing significant performance problems. Many queries used by the Security Solution touch every document in a given index. This is ineffective in large volume sites (e.g. sites which ingest 30 million documents per hour.)

By using transforms to create entity-centric collections, and by using transforms to track metrics, we can significantly optimize our queries. This will dramatically improve UX for our customer's most demanding use cases.

# Detailed design (TODO)

This is the bulk of the RFC. Explain the design in enough detail for somebody
familiar with Kibana to understand, and for somebody familiar with the
implementation to implement. This should get into specifics and corner-cases,
and include examples of how the feature is used. Any new terminology should be
defined here.

# Drawbacks (TODO)

Why should we *not* do this? Please consider:

- implementation cost, both in term of code size and complexity
- the impact on teaching people Kibana development
- integration of this feature with other existing and planned features
- cost of migrating existing Kibana plugins (is it a breaking change?)

There are tradeoffs to choosing any path. Attempt to identify them here.

# Alternatives (TODO)

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy (TODO)

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

# How we teach this (TODO)

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions (TODO)

Optional, but suggested for first drafts. What parts of the design are still
TBD?