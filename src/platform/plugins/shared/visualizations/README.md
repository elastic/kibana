# Visualizations

The Visualizations plugin registers the visualization saved object type, the `legacy_vis` embeddable,
and the vis type registries that the individual `vis_types` plugins add to.

## Legacy panel migrations (server)

Dashboards can return a by-value `legacy_vis` panel as a newer, supported panel type when the
dashboard is read. The stored dashboard saved object is not changed.

A vis type plugin registers a handler during server `setup`:

```ts
visualizations.registerLegacyPanelMigration('my_vis_type', {
  to: 'my_panel_type',
  migrate: ({ savedVis, panelConfig }) => toMyPanelConfig(savedVis, panelConfig),
});
```

- `savedVis` is the panel's `SerializedVis`, with its references already injected.
- `panelConfig` holds the panel-level `title`, `description`, `hide_title`, `hide_border`,
  `time_range`, and `drilldowns`.
- Return the config for the `to` panel type, or `undefined` to leave the panel as `legacy_vis`.
  Throwing drops the panel with a `dropped_panel` warning.
- Only one handler can be registered per vis type.

The Visualizations plugin registers a single `legacy_vis` panel type migration with the Embeddable
plugin and passes each by-value panel to the handler for its `savedVis.type`. By-reference panels
(`savedObjectId`) are not migrated and stay `legacy_vis`.

Vega (`vega` → `vega`) is the first handler. Markdown and the legacy Maps vis types (`tile_map`,
`region_map`) are expected to follow.
