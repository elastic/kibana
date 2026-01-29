---
title: Dashboard Plugin Guide for Agents
---

# Dashboard (dashboard)

The dashboard plugin registers the dashboard app and the dashboard embeddable used across Kibana.

## Architecture and entry points
- Public plugin: `public/plugin.tsx`
- Server plugin: `server/plugin.ts`
- App router: `public/dashboard_app/`
- Renderer: `public/dashboard_renderer/`
- State API: `public/dashboard_api/`
- Saved object logic: `server/dashboard_saved_object/`

## Key concepts
- Dashboards are saved objects with panels, controls, and query state.
- Embeddables are the primary mechanism for rendering panels.
- Dashboard API is the recommended integration surface for reading and rendering.

## Constraints and caveats
- Server `getDashboard()` and `scanDashboards()` are deprecated; use `client.read`.
- Locator server limitations: avoid `preserveSavedFilters` in server `getLocation()`.
- Migration logic is complex; validate panel references when modifying schema.

## Testing
- Unit tests: `src/platform/plugins/shared/dashboard/jest.config.js`
- Functional tests: `src/platform/test/functional/apps/dashboard/`
- X-pack functional: `x-pack/platform/test/functional/apps/dashboard/`
- API integration: `src/platform/test/api_integration/apis/dashboards/`
- Example: `yarn test:jest src/platform/plugins/shared/dashboard`
- If a verifier sub-agent exists (e.g., `kibana-verifier` or `verifier`), run it and include its findings in the test notes.

## Escalation
If changes impact embeddable contracts or dashboard saved object behavior, coordinate with the owning teams before finalizing.

## References
- `src/platform/plugins/shared/dashboard/README.asciidoc`
- `src/platform/test/functional/apps/dashboard/README.md`
