---
navigation_title: "Best practices"
description: "Remaining best-practices content pending extraction to team-internal docs"
---

# Best practices

:::{note}
This page is a placeholder for content that will be extracted to team-internal documentation in a follow-up. Topical guidance that used to live here has moved:

- **Security** — [Security](./security.md)
- **Accessibility** — [Accessibility](./accessibility.md)
- **Localization** — [Internationalization](./internationalization.md)
- **Performance** — [Performance](./performance.md)
- **Testing scenarios** — [Test coverage checklist](../../testing/test-coverage-checklist.md)
- **Feature development (size, monorepo)** — [Feature development](../workflow/feature-development.md)
- **Breaking up packages** — [Package design](../codebase/package-design.md)
- **Logging** — [Logging](../codebase/logging.md)
- **SavedObjectClient / backward compatibility** — [Saved objects and migrations](../codebase/saved-objects-and-migrations.md)
- **Common mistakes (filesystem, memory, WebSockets)** — [Runtime constraints](../codebase/runtime-constraints.md)
- **Style guide, re-inventing the wheel, public APIs, reusable components** — folded into [Developer principles](./developer-principles.md)
- **HTTP API standards (privacy, paths, release tags, breaking changes, telemetry, APM, documentation)** — merged into [Guidelines for HTTP API design in Kibana](../api-design/guidelines-for-http-api-design-in-kibana.md)
:::

## Feature development

### Timing

### LG TODO extract this to a kibana-team document
:::{note} Internal only
Try not to put your PR in review mode, or merge large changes, right before Feature Freeze. It's inevitably one of the most volatile times for the
Kibana code base, try not to contribute to this volatility. Doing this can:

- increase the likelihood of conflicts from other features being merged at the last minute
- means your feature has less QA time
- means your feature gets less careful review as reviewers are often swamped at this time

All of the above contributes to more bugs being found in the QA cycle and can cause a delay in the release. Prefer instead to merge
your large change right _after_ feature freeze. If you are worried about missing your initial release version goals, review our
release train philosophy. It's okay!
:::

## Licensing

### LG TODO move this section to kibana-team

:::{note} Internal only
Has there been a discussion about which license this feature should be available under? Open up a license issue in [https://github.com/elastic/dev](https://github.com/elastic/dev) if you are unsure.
:::
