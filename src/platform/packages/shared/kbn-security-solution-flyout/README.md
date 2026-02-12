# @kbn/security-solution-flyout

## Purpose

This package contains the code that is used to render Security document flyouts (alert, event, host, user, network,
network) and Security tools flyouts (analyzer, session view, graph, insights...) in the Security Solution and Discover
plugins.

Most the of code already exists in the `flyout` folder in the `security_solution` plugin (
see https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/plugins/security_solution/public/flyout) and
will slowly be moved here.

## Folder Structure

The structure of the `flyout` folder is intended to work as follows:

- multiple top level folders referring to the _type_ of flyout (for example document details, user, host, rule,
  cases...) and would contain all the panels for that flyout _type_. Each of these top level folders can be organized
  the way you want, but we recommend following a similar structure to the one we have for the `document_details` flyout
  type, where the `right`, `left` and `preview` folders correspond to the panels displayed in the right, left and
  preview flyout sections respectively. The `shared` folder contains any shared components/hooks/services/helpers that
  are used within the other folders.

```
documents
└─── alert
└─── host
└─── user
└─── newtwork
tools
└─── analyzer
└─── session_view
└─── graph
└─── prevalence
└─── correlations
└─── threat_intelligence
└─── prevalence
└─── entities
```

## Thoughts when contributing to this package

As this code is meant to be used in the Security Solution and Discover plugins, please make sure that they are:

- well documented
- well unit tested
