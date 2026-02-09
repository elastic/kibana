# @kbn/flyout-ui

## Purpose

This package offers a set a UI components, hooks and util functions intended to be used in flyouts. These components
currently exist in the `shared` folder under the `flyout` folder in the `security_solution` plugin (
see https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/plugins/security_solution/public/flyout/shared).

These components will be used (at least at first ) in Security document flyouts (like alert, event, host, user, rule and
network) and tools flyouts (like analyzer, session view, graph, insights...) in the Security Solution and Discover
plugins.

## List of components, hooks and utils

> Components, hooks and util functions will be added to this package as they needed when moving the content of the
> Security flyouts.

## Thoughts when contributing to this package

As these components, hooks and util functions are meant to be used in all flyouts, please make sure that they are:

- well documented
- extremely well unit tested

Also, for UI components, Storybook files should be added.
