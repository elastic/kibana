# Create Index Pattern

This is meant to serve as a guide to this area of code.

## Bye bye regressions
In order to prevent future regressions, there are a few scenarios
that need to be tested with each change to this area of the code.

- Cross cluster search
  - Ensure changes work properly in a CCS environment
  - A solid CCS environment involves various indices on all nodes including the controlling node.
- Alias support
  - Indices are the most common use case, but we also support aliases.