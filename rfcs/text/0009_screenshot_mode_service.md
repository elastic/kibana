- Start Date: 2020-03-02
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Applications should be aware when their UI is rendered for purposes of
capturing a screenshot. This ability would improve the quality of the Kibana
Reporting feature for a few reasons:
 - Fewer objects in the headless browser memory since interactive code doesn't run
 - Fewer Reporting bugs in releases since App teams have more ownership and
   control over the reportability of their UI

**Screenshot mode service**

Applications in Kibana should be aware of when their rendering is for a human
user using the page interactively, and when it's not. Sometimes the page is
loaded for display-purposes: there is no user in control of the
browser and no need for interactivity. Having Kibana support that purpose
allows higher-level features to be built on top of rapidly-available images of
Kibana pages. This turns out to be crucial for features like scheduled PDF
report generation, and automated alerts with embedded images.

As a bridge between the Kibana applications screenshot-capture features is
needed as a service in Kibana. This RFC names that service the Screenshot
Mode Service (name TBD). Applications would read from this service while
loading UI components into the browser, and help the application make
case-by-case bases for loading components and the parameters that get passed
into the components.

In most cases, the information coming from this service would help the
application determine which UI components should **not** be loaded, as applications will
use the service response for skipping components that aren't needed for
presenting the data in a screenshot, and thus work towards better performance
for the display-only purpose.

More background on how Reporting currently works, including the lifecycle of
creating a PNG report, is here: https://github.com/elastic/kibana/issues/59396

# Basic example

When Kibana loads initially, there is a Newsfeed component in the UI that
checks internally cached records to see if it must fetch the Elastic News
Service for newer items. When the Screenshot Mode Service is implemented, the
Newsfeed component has a source of information to check on whether or not it
should load in the Kibana UI. If it can avoid loading, it avoids an unnecessary
HTTP round trip, which weigh heavily on performance.

# Motivation

Kibana Reporting is a commercial feature in Elastic and is highly capable of
loading the application pages and converting them into a screenshot for PNG or
PDF export. However, the way it works has downsides with performance,
maintainability, and expanding it as a tool that can power higher-level
features. The solution to those downsides is to have Kibana pages themselves
become more capable at presenting themselves for screenshot capture reports.
With the Screenshot Mode Service available, Reporting could drop the
task that it currently has which hurt performance: wasted rendering that is
replaced with custom styles that make the page "reportable."

The technical advantage of having such as service also leads to making Kibana
application pages "printable", in the sense that sending the page to a printer
for a hard copy results in something more meaningful and specialized for paper
than today's Kibana can guarantee. This isn't a big concern for Kibana since
there isn't the expectation to improve printing Kibana, but that technical
direction is appropriate for improving PDF report generation.

# Detailed design

The Screenshot Mode Service is a callable API available as dependency for
Kibana applications.

A method of the API tells the Application whether or not it should render
itself to optimize for non-interactivity.

In a future phase, the API might also tell the application more about the
report, such as PDF page dimensions, or special layout types (print layout,
etc).

## Interface
The `setupDeps.screenshotMode` object has a single purpose: tell the app if it
should render in an optimized way for screenshot capture:

```
interface ScreenshotModeServiceSetup {
  isScreenshotMode: () => boolean;
}
```

Internally, this object is constructed from a class that refers to information
sent via a custom proprietary header:

```
interface HeaderData {
  'X-Screenshot-Mode': true
}

class ScreenshotModeServiceSetup {
  constructor(rawData: HeaderData) {}
  public isScreenshotMode (): boolean {}
}
```

This works because the headless browser that opens the page can inject custom
headers into the request. Teams can test how their app renders when loaded with
this header using a new configuration setting, or a web debugging proxy, or
some other tool that is TBD.

# Alternatives

- Print media query CSS
  If applications UIs supported printability using `@media print`, and Kibana 
  Reporting uses `page.print()` to capture the PDF, it would be easy for application 
  developers to test, and prevent bugs showing up in the report.
  
  However, this solution doesn't include performance benefits of reducing objects 
  in the headless browser memory: the headless browser still has to render the entire 
  page as a "normal" render before it is able to call `page.print()`. No one sees the 
  results of that initial render, so it is the same amount of wasted rendering cycles 
  during report generation that we have today.

# Adoption strategy

The Reporting Services team should create an few example in a developer example plugin
on how to integrate an App with the Screenshot Mode Service. From there, the team should 
work with App teams in a consulting role to establish usage of this service.

# How we teach this

The Reporting Services team can offer statistics in a weekly update about how many 
Reporting-enabled applications are using this service. This will help people remember
that it is available. If the team can also provide statistics about how many bugs this is 
fixing, how much time it saves in generating a report, etc, then it will also help
people understand why it is important.

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
