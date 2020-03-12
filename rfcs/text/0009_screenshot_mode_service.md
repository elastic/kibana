- Start Date: 2020-03-02
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

The Kibana Reporting team has been chasing ways of improving performance of
loading Kibana pages and capturing screenshots of the visualizations. We think
that performance is a barrier to adding more integrations in Kibana, however we
want to add more integrations and have Reporting be a factor of growth for
Kibana. However, it looks like there are too many constraints to streamlining
performance for Reporting if we only look for ways to change the Reporting code
to do it. In other words, it will take a cross-team effort to improve the main
performance issues. This RFC proposes one way to make cross-team efforts work
smoothly, which is to have a new core service in Kibana that helps UIs and
visualizations work nicely when loaded for screenshot capture.

**Screenshot mode service**

Applications in Kibana should be aware of when their rendering is for a human
user using the page interactively, and when it's not. Sometimes the page is
loaded for display-purposes: there is no user in control of the
browser and no need for interactivity. Having Kibana support that purpose
allows higher-level features to be built on top of rapidly-available images of
Kibana pages. This turns out to be crucial for features like scheduled PDF
report generation, and automated alerts with embedded images.

As a bridge between the Kibana applications screenshot-capture features is
needed as a core service in Kibana. This RFC names that service the Screenshot
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
With the Screenshot Mode Service available in core, Reporting could drop the
task that it currently has which hurt performance: wasted rendering that is
replaced with custom styles that make the page "reportable."

The technical advantage of having such as service also leads to making Kibana
application pages "printable", in the sense that sending the page to a printer
for a hard copy results in something more meaningful and specialized for paper
than today's Kibana can guarantee. This isn't a big concern for Kibana since
there isn't the expectation to improve printing Kibana, but that technical
direction is appropriate for improving PDF report generation.

# Detailed design

The Screenshot Mode Service is a callable API available in the context of a
request on the server side, and as a pubic coreSetup Javascript API.

The data provided by the Screenshot Mode are signals about:
 - whether or not the context of the page load is for a screenshot capture
 - layout and dimensions that the result image is expected to be
 - time zone for which to format the page data

There are a few ways for the service to obtain the data for its internal state.
The most typical way would be to have a URL query string variable with the
raw data and have the service read it when an API client is constructed. The
service would provide some abstractions around that data to the different
applications.

The new query string parameter could appear in the URL of any Kibana
application. Adding new URL query string parameters is a non-breaking change,
and applications would not be impacted by having this additional data in the URL.

Since the service data needs to be an object, the best way to encode it as data
in a URL is to use Rison encoding. An example of what that would look like in a
Kibana URL (with linebreaks added):

```
http://localhost:5601/app/kibana#/discover?_g=()
&_a=(columns:!(_source),index:'6a047550-4e87-11ea-ad93-21278bc67061',interval:auto,query:(language:kuery,query:''),sort:!())
&screenshots=(enabled:!t,layout:(height:500,width:400),timezone:PST)
```

That shows an example way of encoding this raw data into the URL as a global
variable called `screenshots`:
```
{
  "enabled": true,
  "layout": {
    "height": 500,
    "width": 400
  },
  "timezone": "PST"
}
```

The rest of the URL is needed by the application and is used for recreating a
certain state of data in the page. In order to be "reportable" these parts of
the URL must be totally sufficient for recreating everything the user expects
to see in a report.

The `screenshot` object has to be crafted in Javascript code. That can be done
by anything, but generally it would be done in Kibana Reporting as a
modification of the URL it is reporting on. Currently, this kind of data acts
as job parameters for PNG and PDF Reporting jobs. Each source document for a
Reporting job already has these fields - they are defined by the applications
in the various points of Reporting integration.

The Screenshot Mode Service would be designed to wrap the raw context data for
applications to consume, and it is up to an outside feature (i.e. Kibana
Reporting) to craft the raw context data. Applications are the parts that make
this design useful for Kibana, by reading the service data and using it to
inform its rendering.

As an example, say there is a visualization that displays data in a UI, and the
data is modeled on the server side. The request handler looks like:

**Before code:**
```javascript
const handler = (request) => {
  const fetchOpts = {
    pageNumber: request.params.pageNumber, // show them the page they navigated to
    rowsPerPage: ITEMS_SET_SIZE_DEFAULT, // show as many items as the user normally sees on this page
  };
  const tableData = fetchData(request, fetchOpts);
  return tableData;
};
```

The "after" code takes care in handling this request, that if it is for the
purpose of rendering a screenshot, the data must be gathered with different
options so the result set will be suitable for non-interactive display.

**After code:**
```javascript
const handler = (request) => {
  const isInteractive = !request.screenshotMode.isScreenshotMode();

  const fetchOpts = {
    pageNumber: isInteractive ? request.params.pageNumber : 0, // start at the beginning if there is no interactive user
    rowsPerPage: isInteractive ? ITEMS_SET_SIZE_DEFAULT : ITEMS_SET_SIZE_MAX, // show as much data as possible if there is no interactive user
  };

  const tableData = fetchData(request, fetchOpts);
  return tableData;
};
```

The `request.screenshotMode` object is an instance of a class that has
functions to abstract it's internal raw data:

```
class ScreenshotModeServiceApi {
  constructor(rawData) {
  }
  public isScreenshotMode (): boolean {
  }
  public getScreenshotDimensions (): ScreenshotLayoutDimensions {
  }
  public getTimezone (): Timezone {
  }
}
```

Getting the screenshot dimensions would be needed only for very specialized use
cases such as the Dashboard application's "print layout" mode.

# Drawbacks

Why should we *not* do this? Please consider:

- Adds extra code that application teams have to maintain and account for in their tests.
- Hard for application teams to create an environment to test against to check the screenshot mode rendering of their work.

As a solution to the drawbacks of extra maintenance and tests needed, the
Reporting Services team could provide libraries to use in automated functional
tests that help verify the integration. There could also be a development tool
in the form of a test Kibana plugin or bookmarklet to help developers check their
work for screenshot mode.

# Alternatives

- Print media query CSS
  Many things can be improved on capturing screenshots from the page using
  `@print` CSS media query selecting. Also, CSS makes things hidden on the
  page, but they are still loading in the DOM and take browser memory
  resources. Print media query CSS are a good supplement to the Screenshot Mode
  Service, but the best performance will come with streamlining the page
  rendering in Javascript. See "further examples" in this RFC about how this
  alternative solution can still be leveraged.

# Adoption strategy

Integrating applications with this service is only going to be necessary when
there are customizations needed to make the application more "reportable."
That will be done by examining the default results of how applications perform
for screenshot capture mode, and tuning the app code for performance as needed.

Some of the first steps would be to have the Reporting services team hoist some
code out of the screenshot pipeline, and start adding the `screenshots`
variable to the URL as a query string parameter. Then, parts of the Reporting
code can be taken apart a bit. The areas that need customization for screenshot
capture will no longer rely on the Reporting plugin to inject those
customizations. The applications will check the Screenshot Mode Service and
inject the specialized customizations as needed.

Having the Screenshot mode service would be a means towards fixing a few bugs
with Reporting rendering. The bug fixes will involve adopting the Screenshot
Mode Service throughout applications: especially in the Dashboard application.
Those fixes will be driven by the Reporting Services team initially.
Eventually, the Dashboard application could feature a few examples in the code
on how to integrate with the Screenshot Mode Service.

Further adoption of this service would happen as we look for ways to improve
the performance and quality of Reporting services throughout Kibana. Those
fine-tuning adoptions can be driven by the Reporting services team, or
application teams, depending on bandwidth available.

# How we teach this

Not every Kibana developer will need to understand the screenshot mode service
to be effective at day-to-day work, but every Kibana developer should be at
least aware of its existence. That way, they can understand it when the time
comes to specialize their application for Reporting. As long as developers are
aware of its existence, they could understand it by reading the code and trying
the test Kibana plugin (if it exists).

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
