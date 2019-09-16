## New Platform (NP) Ready vs Quarantined

We want to move toward more modularised code in the Console app.
Part of the effort means separating out different console components
like:

- The language parser
- The editor rendering component
- Autocomplete
- The UI container components

In addition to this effort we want to bring Console in line with NP
requirements and ensure that we are not using angular and public ui
in this app anymore.

The quarantined folder contains all of the code that has not been cleared
for living in the new platform as it has not been properly refactored
or has dependencies on, for example, UI public.

Over time, the quarantined part of the code should shrink to nothing
and we should only have NP ready code.
