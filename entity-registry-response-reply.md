Makes sense to keep both paths available - agreed that not every field needs a full entity lifecycle.

The main thing I'd emphasize is that `entityRegistry` isn't just about DRY - it's about enabling **typed autocomplete across the workflow graph** (trigger → step → step). With step-scoped selection, each step's output schema is opaque to the next. The registry lets the editor know that `{{ event.case.title }}` and `{{ steps.getCase.output.case.title }}` are the same entity type, enabling consistent autocomplete throughout the workflow.

But agreed we can build toward that incrementally - your phased roadmap makes sense.
