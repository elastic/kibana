# @kbn/unsaved-changes-badge

A yellow "Unsaved changes" badge which can be found for example on Discover page.
It supports callbacks to save or revert the changes.

To integrate it into TopNav component, consider using `getTopNavUnsavedChangesBadge(...)` util and pass the result to `badges` prop of the top nav.

There is also a standalone component `<UnsavedChangesBadge .../>`.
