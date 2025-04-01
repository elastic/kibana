# Redirect endpoint

This folder contains implementation of *the Redirect Endpoint*. The Redirect
Endpoint receives parameters of a locator and then "redirects" the user using
navigation without page refresh to the location targeted by the locator. While
using the locator, it is also possible to set the *location state* of the
target page. Location state is a serializable object which can be passed to
the destination app while navigating without a page reload.

```
/app/r?l=MY_LOCATOR&v=7.14.0&p=(dashboardId:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

For example:

```
/app/r?l=DISCOVER_APP_LOCATOR&v=7.14.0&p={%22indexPatternId%22:%22d3d7af60-4c81-11e8-b3d7-01146121b73d%22}
```
