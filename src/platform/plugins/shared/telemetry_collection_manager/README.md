# Telemetry Collection Manager

Telemetry's collection manager to go through all the telemetry sources when fetching it before reporting.

It has been split into a separate plugin because the `telemetry` plugin was pretty much being a passthrough in many cases to instantiate and maintain the logic of this bit.

For separation of concerns, it's better to have this piece of logic independent to the rest.
