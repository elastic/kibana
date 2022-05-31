# `userContent` plugin

The `userContent` plugin manages user generated content (`Saved Objects` created by our users that we surface in the UI).

This plugin is currently responsible to add hooks (`pre|post` methods) to the saved object client to register metadata events (e.g "viewed"|"edited"...) of saved objects.

### Possible future use cases for this plugin

This plugin is part of a POC for an RFC. These are just ideas that come to mind when thinking about a common layer that exposes common functionalities for all "user generated content" (e.g. dashboard, visualisations, maps...).

* Unify and validate saved object mappings with common metadata for user generated content ("title", "description"...)
* Tagging
* Saved object relationship management
* Saved objects comments/annotation
* Space sharing
* "History" feature to navigate to previous versions of a saved object
* "Bin". Keep saved objects 30 days in a "deleted" state before actually deleting them.
