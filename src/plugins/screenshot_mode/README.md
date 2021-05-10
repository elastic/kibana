# Screenshot Mode

This plugin is used to inform other plugins about whether the current UI is being viewed for screenshot purposes. The service exposed by this plugin informs consumers whether they should render UI to optimize for non-interactivity. In this way plugins can avoid loading unnecessary code, data or other services.

The plugin is low-level as it has no dependencies of its own, so other
low-level plugins can depend on it.

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions setting up your development environment.
