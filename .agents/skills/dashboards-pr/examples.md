# Examples

## Team PRs (2024 to early 2025): the target tone

Written by people, before AI-generated descriptions. Copy their brevity and plain language, not their exact layout or their openers ("This PR fixes..."): the reference outputs below show the current shape.

**[#211041](https://github.com/elastic/kibana/pull/211041) `[Links] Fix link settings not persisting`** (Heenawter): problem in user terms, one sentence of cause, before/after videos.

> Closes https://github.com/elastic/kibana/issues/211022
>
> This PR fixes a bug with persisting Link options where, because we weren't providing the "initial" state to the options editor, it was always starting with the default state - therefore, editing something **other** than the options would reset the link options back to the default.
>
> **Before:** <video> **After:** <video>

**[#215426](https://github.com/elastic/kibana/pull/215426) `[Lens] Fix coloring/palette assignment on partition charts`** (nickofthyme): one-line fix statement, a video, then reviewer detail kept separate.

> Fixes an issue where reordering the groups within a layer would incorrectly assign the color mapping to a group other than the first.
>
> <video>
>
> Fixes #203178
>
> ## Details
> The issue here was due to the order of the columns. The `colorMapping` prop is applied at the layer so we need to find the first non-collapsed group to take "ownership" of the color mapping config. [...]

**[#214512](https://github.com/elastic/kibana/pull/214512) `[kbn-grid-layout] Smoother scrolling`** (ThomThomson): user-visible effect, then a side-by-side Before/After table.

> This PR uses `requestAnimationFrame` to make the autoscroll functionality match the refresh rate of the display. Previously, the autoscroll [...] resulted in some noticeable choppiness [...]
>
> | Before | After |
> | --- | --- |
> | <gif> | <gif> |

**[#196184](https://github.com/elastic/kibana/pull/196184) `[Lens] fit line charts by default`** (markov00): one sentence, screenshots, a release note.

> Every line charts are now interpolated by default with a linear interpolation.
>
> before: <img> after: <img>
>
> ## Release note
> Newly and default configured Lens line charts are now interpolated by default with a straight Linear interpolation.

**[#213164](https://github.com/elastic/kibana/pull/213164) `[controls] fix Korean characters split [...] in options list search input`** (nreese): concrete test steps with the expected result.

> Test steps
> * Follow <video link> to setup dual language inputs with English and Korean.
> * Create a dashboard with an options list. Switch to Korean input and type in option list control. Type the characters `d` and `k` on an english keyboard.
> * Ensure input treats value as a single character.

## Reference output: a bug fix

Rewrite of [#305973](https://github.com/elastic/kibana/pull/305973). The issue had no reproduction steps, so the skill wrote them. Screenshots weren't supplied, so placeholders were left and requested.

Title: `[Maps] Fix missing city dots on the Dark basemap`

````markdown
## Summary

Part of https://github.com/elastic/kibana/issues/306002

When a map uses the **Dark** basemap, the small dots that mark cities at low zoom levels are missing, and the browser console logs an `Image "circle-11" could not be loaded` warning every time the map renders.

The Dark basemap describes some of its icons in an older format that Kibana didn't handle, so the map couldn't find those icons. Kibana now handles that format too: the city dots are back and the warning is gone. The other basemaps were not affected.

| Before | After |
| --- | --- |
| <!-- screenshot: Dark basemap at zoom ~4, no city dots --> | <!-- screenshot: same view, city dots visible --> |

## How to test

**Reproduce on `main`**

1. Install the **Sample web logs** data set.
2. Go to **Maps**, create a new map, and keep the default basemap.
3. Switch Kibana to dark mode (or change the basemap layer style to **Dark**).
4. Zoom out to about zoom level 4 and open the browser console.
5. City dots are missing next to city names, and the console shows `Image "circle-11" could not be loaded`.

**Verify on this branch**

1. Repeat the steps above.
2. City dots render next to city names at low zoom, and the warning no longer appears.
3. Zoom in past level 9: the dots disappear as intended, leaving only the labels.

## Review notes

<details>
<summary>Where to start, intended behavior, open items</summary>

#### Start here

`_namespaceImageProperty` in `ems_vector_tile_layer.tsx`.

#### Intended behavior

- Icon references in legacy zoom functions (`{ "stops": [[0, "circle-11"], [9, ""]] }`) now get the basemap prefix too.
- Empty ids (`""`, meaning "no icon") stay unchanged.
- Plain string references behave as before.

#### Open

- The warning only became visible with MapLibre 6.4.1 (#301722); before, a fallback silently added an empty placeholder image.

</details>

## Checklist

<details>
<summary>4 of 8 checked. The others don't apply: no UI text, user docs, config keys or functional tests changed</summary>

<template checklist items, verbatim, ticked where verified>

</details>

## Identify risks

<details>
<summary>Low: only basemap icon references change</summary>

Low risk. Plain string references behave as before, and only zoom-function references are newly handled. Unit tests cover both forms.

</details>
````

## Reference output: an internal refactor with agent-visible behavior

Rewrite of [#303164](https://github.com/elastic/kibana/pull/303164). The original was about 900 words; the visible part is now about 150, and reviewer-only intent lives in Review notes. No screenshots apply, so a small input-shape table stands in for Before/After.

Title: `[Dashboards in Chat] Name each generated panel with a single type`

````markdown
## Summary

Closes https://github.com/elastic/kibana/issues/303860
Closes https://github.com/elastic/kibana/issues/296106

When the agent builds or edits a dashboard in chat, it had to describe each panel in two steps: first where the panel comes from, then which kind of panel it is. That made the dashboard tool's instructions long and easy to get wrong. An edit that left out the panel kind was silently treated as a Lens panel, even when the panel was a Vega chart.

Now the agent names each panel with a single type (Lens, Vega, custom content, Markdown, an ML chart, or a chat attachment), the same names its guidance already uses. Editing a panel with the wrong type fails with a clear message the agent can act on: `Panel "x" is a Vega panel. Edit it with type: "vega".` This also shrinks the tool's schema, the last step of #296106.

| Before | After |
| --- | --- |
| `{ source: "request", renderer: "vega", query }` | `{ type: "vega", query }` |
| `{ source: "config", type: "markdown", config }` | `{ type: "markdown", config }` |

## How to test

1. Install the **Sample web logs** data set and open the Agent Builder chat.
2. Ask: "Create a dashboard about web logs with a Lens line chart of requests over time, a Vega chart of bytes by country, and a Markdown panel with a short description."
3. The dashboard is created with all three panels.
4. Ask the agent to change the Vega chart's title, then the Markdown text.
5. Both edits apply to the right panels, and neither is converted into a Lens panel.

## Review notes

<details>
<summary>Where to start, intended behavior, extra changes, open items</summary>

#### Start here

`panels/registry.ts` and `panels/panel_kind.ts` in `@kbn/dashboard-agent-authoring`. The rest follows from them.

#### Intended behavior

- Calls in the old `source`/`renderer` shape are rejected. There is no legacy path.
- The agent guidance moves to the new shape in this same PR.
- A leftover `source` next to a valid `type` is ignored, not rejected.
- Custom content keeps its loose schema from #304963.

#### Also in this PR

- Text owned by other teams now uses the new shape: custom content's tool description and README, and ML's attachment descriptions, `create_ml_charts` and anomaly detection skill.
- Small fixes to the ML anomaly detection skill: unique panel ids, no fixed sizes, and the realtime step edits existing panels.
- The ML Panels eval setup, broken on `main`, is fixed (missing `elastic-api-version` header and `influencers`).

#### Open

- Evals ran by hand with no rejected calls. A comparison run on `main` is still pending, to check whether a few low scores are regressions.

</details>

## Checklist

<details>
<summary>4 of 8 checked. The others don't apply: no UI text, user docs, config keys or functional tests changed</summary>

<template checklist items, verbatim, ticked where verified>

</details>

## Identify risks

<details>
<summary>Medium: agent tool contract changes with no fallback</summary>

Medium risk for agent behavior: the tool contract changes with no fallback, so an agent still producing the old shape gets validation errors. Evals show no rejected calls, but the comparison with `main` is pending. No saved-object or HTTP API change, so stored dashboards are unaffected.

</details>
````

What was dropped from the original and why: the list of renamed and removed functions (the diff shows it), per-package type-check and Jest counts (CI shows them), and detailed eval score tables (one line in Open is enough).
