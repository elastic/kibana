# Kibana RFCs

> We are currently trialing a new RFC process for the Kibana Core team at this time.

Many changes, including small to medium features, fixes, and documentation 
improvements can be implemented and reviewed via the normal GitHub pull request 
workflow.

Some changes though are "substantial", and we ask that these be put
through a bit of a design process and produce a consensus among the relevant
Kibana team.

The "RFC" (request for comments) process is intended to provide a
consistent and controlled path for new features to enter the project.

[Active RFC List](https://github.com/elastic/kibana/pulls?q=is%3Aopen+is%3Apr+label%3ARFC)

Kibana is still **actively developing** this process, and it will still change as
more features are implemented and the community settles on specific approaches
to feature development.

## Contributor License Agreement (CLA)

In order to accept your pull request, we need you to submit a CLA. You only need
to do this once, so if you've done this for another Elastic open source
project, you're good to go.

**[Complete your CLA here.](https://www.elastic.co/contributor-agreement)**

## When to follow this process

You should consider using this process if you intend to make "substantial"
changes to Kibana or its documentation. Some examples that would benefit
from an RFC are:

   - A new feature that creates new API surface area, such as a new core
     service available to plugins.
   - The removal of features that already shipped as part of a release.
   - The introduction of new idiomatic usage or conventions, even if they
     do not include code changes to Kibana itself.

The RFC process is a great opportunity to get more eyeballs on your proposal
before it becomes a part of a released version of Kibana. Quite often, even
proposals that seem "obvious" can be significantly improved once a wider
group of interested people have a chance to weigh in.

The RFC process can also be helpful to encourage discussions about a proposed
feature as it is being designed, and incorporate important constraints into
the design while it's easier to change, before the design has been fully
implemented.

Some changes do not require an RFC:

  - Rephrasing, reorganizing or refactoring
  - Addition or removal of warnings
  - Additions that strictly improve objective, numerical quality
  criteria (speedup, better browser support)
  - Addition of features that do not impact other Kibana plugins (do not
  expose any API to other plugins)

## What the process is

In short, to get a major feature added to Kibana Core, one usually first gets
the RFC merged into the RFC tree as a markdown file. At that point the RFC
is 'active' and may be implemented with the goal of eventual inclusion
into Kibana.

* Fork the Kibana repo http://github.com/elastic/kibana
* Copy `rfcs/0000_template.md` to `rfcs/text/0001_my_feature.md` (where
'my_feature' is descriptive. Assign a number. Check that an RFC with this
number doesn't already exist in `master` or an open PR).
* Fill in the RFC. Put care into the details: **RFCs that do not
present convincing motivation, demonstrate understanding of the
impact of the design, or are disingenuous about the drawbacks or
alternatives tend to be poorly-received**.
* Submit a pull request. As a pull request the RFC will receive design
feedback from the larger community and Elastic staff. The author should
be prepared to revise it in response.
* Build consensus and integrate feedback. RFCs that have broad support
are much more likely to make progress than those that don't receive any
comments.
* Eventually, the team will decide whether the RFC is a candidate
for inclusion in Kibana.
* RFCs that are candidates for inclusion in Kibana will enter a "final comment
period" lasting at least 3 working days. The beginning of this period will be signaled with a
comment and tag on the RFCs pull request.
* An RFC can be modified based upon feedback from the team and community.
Significant modifications may trigger a new final comment period.
* An RFC may be rejected by the team after public discussion has settled
and comments have been made summarizing the rationale for rejection. A member of
the team should then close the RFCs associated pull request.
* An RFC may be accepted at the close of its final comment period. A team
member will merge the RFCs associated pull request, at which point the RFC will
become 'active'.

## The RFC life-cycle

Once an RFC becomes active, then authors may implement it and submit the
feature as a pull request to the Kibana repo. Becoming 'active' is not a rubber
stamp, and in particular still does not mean the feature will ultimately
be merged; it does mean that the core team has agreed to it in principle
and are amenable to merging it.

Furthermore, the fact that a given RFC has been accepted and is
'active' implies nothing about what priority is assigned to its
implementation, nor whether anybody is currently working on it.

Modifications to active RFCs can be done in followup PRs. We strive
to write each RFC in a manner that it will reflect the final design of
the feature; but the nature of the process means that we cannot expect
every merged RFC to actually reflect what the end result will be at
the time of the next major release; therefore we try to keep each RFC
document somewhat in sync with the Kibana feature as planned,
tracking such changes via followup pull requests to the document. You
may include updates to the RFC in the same PR that makes the code change.

## Implementing an RFC

The author of an RFC is not obligated to implement it. Of course, the
RFC author (like any other developer) is welcome to post an
implementation for review after the RFC has been accepted.

If you are interested in working on the implementation for an 'active'
RFC, but cannot determine if someone else is already working on it,
feel free to ask (e.g. by leaving a comment on the associated issue).

## Reviewing RFCs

Each week the team will attempt to review some set of open RFC
pull requests.

Every accepted feature should have a core team champion,
who will represent the feature and its progress.

**Kibana's RFC process owes its inspiration to the [React RFC process], [Yarn RFC process], [Rust RFC process], and [Ember RFC process]**

[React RFC process]: https://github.com/reactjs/rfcs
[Yarn RFC process]: https://github.com/yarnpkg/rfcs
[Rust RFC process]: https://github.com/rust-lang/rfcs
[Ember RFC process]: https://github.com/emberjs/rfcs
