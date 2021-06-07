- Start Date: (fill me in with today's date, YYYY-MM-DD)
- TTL: (e.g. "April 20th, 2021", time the review is expected to be completed by. Don't use relative days.)
- Champion: (usually you, person who writes and updates the draft and incorporates feedback)
- Main reviewer: (somebody familiar with the subject matter, who has committed to provide timely and detailed reviews for this RFC)
- Owner team: (team who will own implementation, if it is accepted)
- Stakeholders: (people or groups who will be affected by the proposed changes)
- RFC PR: (leave this empty, it will be a link to PR of this RFC)
- PoC PR: (optional, link to a PoC implementation of the feature)
- Kibana Issue: (link to issue where the proposed feature is tracked)


# Executive Summary

Summarize this RFC so those unfamiliar with the project and code can quickly understand
what the problem is, why it is important,
and the proposed solution. Below are some suggested sections for the Executive
Summary. Tweak as you desire and try to keep it succinct.

## Problem statement

What is the problem we are trying to solve? Supply any relevant background
context. Why is this something we should focus on _now_.

Focus on explaining the problem so that if this RFC is not accepted, this
information could be used to develop alternative solutions. In other words,
don't couple this too closely with the solution you have in mind.

## Goals

What are the goals of this project? How will we know if it was successful?

## Proposal

What are we doing to achieve the goals and solve the problem?


# Who is affected and how

Use this section to hone in on who will be affected and how. For example:

- Are consumers of a specific plugin affected because of a public API change?
- Will all Kibana Contributors be affected because of a change that may affect
  the development experience?


# Detailed design

This is the bulk of the RFC. Explain the design in enough detail for somebody
familiar with Kibana to understand, and for somebody familiar with the
implementation to implement. This should get into specifics and corner-cases,
and include examples of how the feature is used. Any new terminology should be
defined here.

Include architectural diagrams if you see fit, a picture is worth a thousand
words.

## Terminology

A glossary of new terms can be very helpful.


# Risks

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


# How this scales

Does this change affect Kibana's performance in a substantial way? Have we discovered
the upper bounds before we see performance degradations? Will any load 
tests be added to cover these scenarios?


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
