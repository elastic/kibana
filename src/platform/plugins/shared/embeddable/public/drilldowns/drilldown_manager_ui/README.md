# Drilldown Manager

Drilldown Manager is the flyout that opens where drilldowns can be managed using
a CRUD UI. (It does not necessarily need to be a flyout, you can also embed it
directly on a page.)

The main React component that this folder exports is `<DrilldownManager>`, which
should normally be rendered in a flyout.

A new instance of Drilldown Manager is rendered for every place where drilldowns
are used. For example, for each panel on the dashboard a separate new Drilldown
Manager is rendered in the flyout.
