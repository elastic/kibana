- Start Date: 2019-12-10
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

The saved object client offered by core is a good low-level interface to interact with saved objects. However in most
cases applications require a common set of functionality on top of the basic CRUD operations provided - things like checking
for duplicate titles or instantiating referenced index pattern objects. Together with some pieces of global ui (saved object finder and the saved object saved modal),
a registry for saved object types as well as the management section for saved objects this functionality should be bundled
in a user space plugin. This RFC lays uot various design decisions around the various parts.

# Basic example

TODO

# Motivation

By consolidating everything in a single plugin owning the functionality and providing
stable, extensible apis, saved object management can get more consistent and easier to
implement for new applications.

# Detailed design

The saved objects plugin will feature the following parts:

* Global UI (currently part of `kibana_react`):
    * `SavedObjectFinder` (listing, suited to be shown in a modal or flyout)
    * `SavedObjectSaveModal` (current standard flow of saving saved objects)
    * `TableListView` (also a listing, but designed to be shown fullscreen in the app directly)
* Management section
    * Registered in the management app showing a list of all saved objects accessible by the user
* Saved object type registry
    * Offering a way to register a type of saved objects to be included in the management section
* Utility functions around saved object saving and loading
    * Static functions offering common functionality transforming raw saved objects prior to saving
      them using the core saved object client
      
## Global UI

TODO

## Management section

TODO

## Saved object type registry      

TODO

## Utility functions transforming saved objects

Not all functionality currently covered by the `SavedObject` super class should be taken over by the `savedObjects` plugin
to avoid centralizing all concerns in one place.

TODO
      
# Drawbacks

In the current architecture the utility functions around saved objects are bundled in a super class individual applications
can inherit from and add their own specific logic. Tearing apart this class and putting the individual functions in their
respective places based on functionality (e.g. serialization of search sources is a concern of the  `data` plugin, checking duplicate
titles is a more agnostic use case better suited for the `savedObjects` plugin) requires substantial refactoring in the current
consumers. While this can be done incrementally, it still imposes a burden on the individual development teams.

By keeping a design closer to current setup, the migration will be easier and quicker at the cost of higher maintenance efforts
for the `savedObjects` plugin itself because of more covered functionality and tighter coupling with other pieces of Kibana like
the `data` plugin.

# Adoption strategy

By migrating the current structure of a central super class with minimal required changes to the new platform as first step,
consumers will get unblocked in their migration efforts quickly without high refactoring effort right now. By marking these
APIs as deprecated from the start and implementing the detailed design laid out in this RFC as an alternative to the central class,
consumers can migrate their current usage step by step without breaking changes. Once all consumers are migrated to the new
APIs, the old central class can be removed.

# How we teach this

TODO

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

* What functionality is there and where should it go? How do the interfaces look like?
* Will there be cyclic dependencies between plugins during the transition?
