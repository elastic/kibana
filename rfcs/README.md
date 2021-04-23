# Kibana RFCs

Many changes, including small to medium features, fixes, and documentation 
improvements can be implemented and reviewed via the normal GitHub pull request 
workflow.

Some changes though are "substantial", and we ask that these be put
through a bit of a design process and produce a consensus among the relevant
Kibana teams.

The "RFC" (request for comments) process is intended to provide a
consistent and controlled path for new features to enter the project.

[Active RFC List](https://github.com/elastic/kibana/pulls?q=is%3Aopen+is%3Apr+label%3ARFC)


## When to follow this process

You should consider using this process if you intend to make "substantial"
changes to Kibana or its documentation. Some examples that would benefit
from an RFC are:

   - A new feature that creates new API surface area, such as a new
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

- Rephrasing, reorganizing or refactoring.
- Addition or removal of warnings.
- Additions that strictly improve objective, numerical quality
  criteria (speedup, better browser support).
- Addition of features that do not impact other Kibana plugins (do not
  expose any API to other plugins).


## Terminology and roles

Each RFC in its title should specify the time it will be up available for
comments, i.e. *ttl*, for example: __"My new feature (ttl: 14 days)"__.

Every RFC should have a *champion* who publishes the initial RFC draft and works
on improving the RFC text though the *repl* loop.

Once the initial RFC draft is published it becomes a living document, where the
*champion* continuously and timely updates it though the *repl* iterations:

1. "read" &mdash; read review feedback of all reviewers;
2. "eval" &mdash; address review comments of all reviewers;
3. "print" &mdash; update the RFC text;
4. "loop" &mdash; repeat.

The *repl* process can repeat multiple times until the changes in the RFC are
either accepted or rejected.

Each RFC should have at least one *main reviewer*, usually an area lead or a
tech lead, somebody familiar with the subject in detail. Other
reviewers&mdash;*voluntary reviewers*&mdash;are always welcome. The tasks of the
*main reviewer* are:

1. provide a detailed in-depth review;
1. provide review if there are no reviews from *voluntary reviewers*;
1. work with the *champion* to update the text of the RFC in timely fashion
   through the *repl* loop process so that within the specified *ttl* time the
   RFC text has addressed all review comments from all reviewers and is deemed
   good to be accepted, or it is found that the proposed changes should be
   rejected;
   - if the RFC is accepted by the *main reviewer*, they must approve the RFC
     pull request within the *ttl* period.
   - if the RFC is rejected, the *main reviewer* must reject the RFC pull
     request with a comment summarizing the rationale for rejection.

Every accepted RFC feature should have an *owner* from the team which will
ultimately maintain the feature long-term. The *owner* will represent the
feature and its progress. The *owner* could be the *champion* or somebody else.


## Process

To get a major feature added to Kibana codebase, one usually
first gets the RFC merged into the RFC tree as a markdown file. At that point
the RFC is 'active' and may be implemented with the goal of eventual inclusion
into Kibana.

- Copy `rfcs/0000_template.md` to `rfcs/text/0001_my_feature.md` (where
  `my_feature` is descriptive. Assign a number. Check that an RFC with this
  number doesn't already exist in `master` or an open PR).
- Fill in the RFC. Put care into the details: **RFCs that do not
  present convincing motivation, demonstrate understanding of the
  impact of the design, or are disingenuous about the drawbacks or
  alternatives tend to be poorly-received**.
- Submit a pull request. As a pull request the RFC will receive design
  feedback from the larger community and Elastic staff. The author should
  be prepared to revise it in response.
- Build consensus and integrate feedback through the *repl* process. RFCs that
  have broad support are much more likely to make progress than those that don't
  receive any comments.
- 3 days before the *ttl* expiry the RFC enters the *final comment period*.
  The *champion* must signal the beginning of this period with a comment on the
  RFC pull request.
  - An RFC can be modified based upon feedback. Significant modifications may
    trigger an new final comment period, hence extension of the RFC *ttl* by 3
    days. The *champion* or the *main reviewer* must signal the extension with a
    comment on the RFC pull request.
- An RFC may be rejected by the *main reviewer* or any *voluntary reviewer* from
  Kibana.
- An RFC may be either *rejected* or *accepted* at the close of its final
  comment period.
  - RFC is *rejected* if it has at least one rejection on the RFC pull request,
    either from the *main reviewer* or any Kibana *voluntary reviewer*.
    - If RFC is *rejected* the RFC pull request is closed.
  - For RFC to be *accepted* the pull request must:
    - Be approved by the *main reviewer*.
    - Not have any rejections from any *voluntary reviewers*.
- At the end of the *ttl*, if RFC is *accepted*, it can be merged.


## The RFC life-cycle

Once an RFC becomes *active*, then *owner* may implement it and submit the
feature as a pull request to the Kibana repo. Becoming *active* is not a rubber
stamp, and in particular still does not mean the feature will ultimately
be merged; it does mean that the team in ownership of the feature has agreed to
it in principle and are amenable to merging it.

Furthermore, the fact that a given RFC has been accepted and is
*active* implies nothing about what priority is assigned to its
implementation, nor whether anybody is currently working on it.


## Implementing an RFC

The author of an RFC is not obligated to implement it. Of course, the
RFC author (like any other developer) is welcome to post an
implementation for review after the RFC has been accepted.

If you are interested in working on the implementation for an *active*
RFC, but cannot determine if someone else is already working on it,
feel free to ask (e.g. by leaving a comment on the associated issue).
