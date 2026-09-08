# Contributing to Internal Steps

## ⚠️ IMPORTANT: Internal Steps Only

This directory (`public/steps/`) contains **internal, workflows-team owned** step definitions only.

## Do NOT Add External Steps Here

**External teams should NOT implement custom steps in this directory.** 

If you are an external team wanting to add a new workflow step:

1. **Create the step in your own plugin** - Steps should be implemented in a plugin owned and maintained by your team
2. **Register via plugin contract** - Use the `workflows_extensions` plugin contract to register your step from your external plugin

See `examples/workflows_extensions_example/README.md` for a complete example of how to implement external steps correctly.

## What Belongs Here

Only step definitions that are:
- Owned by the workflows team
- Core to the workflows functionality
- Internal implementation details

Examples of internal step definitions currently in this directory:
- Data transformation steps (`data/`)
- AI-related steps (`ai/`)

## Questions?

If you're unsure whether your step should be internal or external, please reach out to the workflows-eng team for guidance before implementing.
