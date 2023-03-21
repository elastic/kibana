## What is this for?

This Placeholder Embeddable is shown when a BY REFERENCE panel (a panel which is linked to a saved object) is cloned using the Dashboard Panel Clone action.

## Why was it made?

This was important for the first iteration of the clone feature so that something could be shown while the saved object was being duplicated, but later iterations of that feature automatically unlink panels on clone. By Value panels don't need a placeholder because they load much faster.

## Can I delete it?

Currently, the only embeddable type that cannot be loaded by value is the Discover Saved Search Embeddable. Without a placeholder embeddable, the dashboard wouldn't reflow at all until after the saved object clone operation is complete.

The placeholder embeddable should be removed as soon as the Discover Saved Search Embeddable can be saved By Value.
