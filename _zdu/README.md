Exploring Zero Downtime Upgrades
========================================================================

This git branch contains experiments trying to figure out what's going
to break when we do zero downtime upgrades.  

Also see: 
["[E&C] Zero downtime upgrade testing plan"](https://docs.google.com/document/d/1TUgGbM44nW90YyASAEE_rXQ16x21eKoKyYcEtgogAj4/edit?usp=sharing).

Beyond the other api versioning things happening, Response Ops plugins
maintain state shared between Kibana instances.  Up until now, it's
always been considered "invalid" to run different versions of Kibana
simultaneously.  With zero downtime upgrades, by definition we will 
have old versions running while the new versions are starting.

One thought on experiments is to run two slightly different Kibanas
at the same time, using the same ES.  For example, running Kibana from
the main branch, and it's ES; and then running Kibana in **this** branch.
This branch will have changes that we want to "see what happens".

This eliminates hassles over HTTP API versioning, SO model/versions, 
data migrations, etc.  Which will be hairy, but ... what else is
lurking!

This branch will need to stay close to main, to avoid changes to ANY
saved object shapes which would cause a migration.

Source code changes from main commented with `// _zdu:` - easy to search
for in your IDE (I hope!).

- [scenario 1](scenario_1.md) - new rule type  - will old Kibana run it?
- [scenario 2](scenario_2.md) - new rule type  - do APIs to old Kibana work?
- [scenario 3](scenario_3.md) - new field in rule SO part of AAD
- [scenario 4](scenario_4.md) - new field in rule SO not part of AAD
