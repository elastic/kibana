# Telemetry Management Section

This plugin adds the Advanced Settings section for the Usage and Security Data collection (aka Telemetry).

The reason for having it separated from the `telemetry` plugin is to avoid circular dependencies. The plugin `advancedSettings` depends on the `home` app that depends on the `telemetry` plugin because of the telemetry banner in the welcome screen.
