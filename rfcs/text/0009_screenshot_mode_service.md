- Start Date: 2020-03-02
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Currently, the applications that support screenshot reports are:
 - Dashboard
 - Visualize Editor
 - Canvas

Kibana UI code should be aware when the page is rendering for the purpose of
capturing a screenshot. There should be a service to interact with low-level
code for providing that awareness. Reporting would interact with this service
to improve the quality of the Kibana Reporting feature for a few reasons:

 - Fewer objects in the headless browser memory since interactive code doesn't run
 - Fewer API requests made by the headless browser for features that don't apply in a non-interactive context

**Screenshot mode service**

The Reporting-enabled applications should use the recommended practice of
having a customized URL for Reporting. The customized URL renders without UI
features like navigation, auto-complete, and anything else that wouldn't make
sense for non-interactive pages.

However, applications are one piece of the UI code in a browser, and they have
dependencies on other UI plugins. Apps can't control plugins and other things
that Kibana loads in the browser.

This RFC proposes a Screenshot Mode Service as a low-level plugin that allows
other plugins (UI code) to make choices when the page is rendering for a screenshot.

More background on how Reporting currently works, including the lifecycle of
creating a PNG report, is here: https://github.com/elastic/kibana/issues/59396

# Motivation

The Reporting team wants all applications to support a customized URLs, such as
Canvas does with its `#/export/workpad/pdf/{workpadId}` UI route. The
customized URL is where an app can solve any rendering issue in a PDF or PNG,
without needing extra CSS to be injected into the page.

However, many low-level plugins have been added to the UI over time. These run
on every page and an application can not turn them off. Reporting performance
is negatively affected by this type of code. When the Reporting team analyzes
customer logs to figure out why a job timed out, we sometimes see requests for
the newsfeed API and telemetry API: services that aren't needed during a
reporting job.

In 7.12.0, using the customized `/export/workpad/pdf` in Canvas, the Sample
Data Flights workpad loads 163 requests. Most of thees requests don't come from
the app itself but from the application container code that Canvas can't turn
off.

# Detailed design

The Screenshot Mode Service is an entirely new plugin that has an API method
that returns a Boolean. The return value tells the plugin whether or not it
should render itself to optimize for non-interactivity.

The plugin is low-level as it has no dependencies of its own, so other
low-level plugins can depend on it.

## Interface
A plugin would depend on `screenshotMode` in kibana.json. That provides
`screenshotMode` as a plugin object. The plugin's purpose is to know when the
page is rendered for screenshot capture, and to interact with plugins through
an API. It allows plugins to decides what to do with the screenshot mode
information.

```
interface IScreenshotModeServiceSetup {
  isScreenshotMode: () => boolean;
}
```

The plugin knows the screenshot mode from request headers: this interface is
constructed from a class that refers to information sent via a custom
proprietary header:

```
interface HeaderData {
  'X-Screenshot-Mode': true
}

class ScreenshotModeServiceSetup implements IScreenshotModeServiceSetup {
  constructor(rawData: HeaderData) {}
  public isScreenshotMode (): boolean {}
}
```

The Reporting headless browser that opens the page can inject custom headers
into the request. Teams should be able to test how their app renders when
loaded with this header. They could use a web debugging proxy, or perhaps the
new service should support a URL parameter which triggers screenshot mode to be
enabled, for easier testing.

# Basic example

When Kibana loads initially, there is a Newsfeed plugin in the UI that
checks internally cached records to see if it must fetch the Elastic News
Service for newer items. When the Screenshot Mode Service is implemented, the
Newsfeed component has a source of information to check on whether or not it
should load in the Kibana UI. If it can avoid loading, it avoids an unnecessary
HTTP round trip, which weigh heavily on performance.

# Alternatives

- Print media query CSS
  If applications UIs supported printability using `@media print`, and Kibana 
  Reporting uses `page.print()` to capture the PDF, it would be easy for application 
  developers to test, and prevent bugs showing up in the report.
  
  However, this proposal only provides high-level customization over visual rendering, which the
  application already has if it uses a customized URL for rendering the layout for screenshots. It
  has a performance downside, as well: the headless browser still has to render the entire 
  page as a "normal" render before we can call `page.print()`. No one sees the 
  results of that initial render, so it is the same amount of wasted rendering cycles 
  during report generation that we have today.

# Adoption strategy

Using this service doesn't mean that anything needs to be replaced or thrown away. It's an add on
that any plugin or even application can use to add conditionals that previously weren't possible.
The Reporting Services team should create an example in a developer example plugin on how to build
a UI that is aware of Screenshot Mode Service. From there, the team would work on updating
whichever code that would benefit from this the most, which we know from analyzing debugging logs
of a report job. The team would work across teams to get it accepted by the owners.

# How we teach this

The Reporting Services team will continue to analyze debug logs of reporting jobs to find if there
is UI code running during a report job that could be optimized by this service. The team would
reach out to the code owners and determine if it makes sense to use this service to improve
screenshot performance of their code.

# Further examples

- Applications can also use screenshot context to customize the way they load.
  An example is Toast Notifications: by default they auto-dismiss themselves
  after 30 seconds or so. That makes sense when there is a human there to
  notice the message, read it and remember it. But if the page is loaded for
  capturing a screenshot, the toast notifications should never disappear. The
  message in the toast needs to be part of the screenshot for its message to
  mean anything, so it should not force the screenshot capture tool to race
  against the toast timeout window.
- Avoid collection and sending of telemetry from the browser when page is
  loaded for screenshot capture.
- Turn off autocomplete features and auto-refresh features that weigh on
  performance for screenshot capture.
