- Start Date: 2020-04-23
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

The reporting plugin is migrating to a purely REST API interface, deprecating page-level integrations such as Dashboard and Discover.

# Basic example

Currently, reporting does expose an API for Dashboard exports as seen below.

```sh
# Massively truncated URL
curl -x POST http://localhost:5601/api/reporting/generate/printablePdf?jobParams=%28browserTimezone%3AAmerica%2FLos_Angeles%2Clayout...
```

Going forth, reporting would only offer a JSON-based REST API, deprecating older ad-hoc solutions:

```sh
curl -x POST http://localhost:5601/api/reporting/pdf
{
  “baseUrl”: “/my/kibana/page/route?foo=bar&reporting=true”,
  "waitUntil": {
    "event": “complete”,
  },
  “viewport”: {
    “width”: 1920,
    “height”: 1080,
    "scale": 1
  },
  "mediaType": "screen"
}
```

A simple JSON response is returned, with an identifier to query for status.

```json
{
  "id": "123"
}
```

Further information can be found via GET call with the job's ID:

```sh
curl http://localhost:5601/api/reporting/123/status
```

# Motivation

The reporting functionality that currently exists in Kibana was originally purpose-built for the Discover, Dashboard and Canvas applications. Because of this, reportings underlying technologies and infrastructure are hard to improve upon and make generally available for pages across Kibana. Currently, the team has to:

- Build and maintain our own Chromium binary for the 3 main operating systems we support.
- Fix and help troubleshoot issues encountered by our users and their complex deployment topologies.
- Ensure successful operation in smaller-sized cloud deployments.
- Help other teams get their applications “reportable”.
- Continue to adapt changes in Discover and Dashboard so that they can be reportable (WebGL for instance).

In order to ensure the reporting works in a secure manner, we also maintain complex logic that ensures nothing goes wrong during report generation. These include:

- Home-rolled security role checks.
- A custom-built network firewall via puppeteer to ensure chromium can’t be hijacked for nefarious purposes.
- Network request interception to apply authorization contexts.
- Configuration checks for both Elasticsearch and Kibana, to ensure the user's configuration is valid and workable.
- CSV formula injection checks, encodings, and other challenges.

It's important that there be a barrier between *how* reporting works, as well as *how* an application in Kibana is rendered. As of today no such barrier exists.

While we understand that many of these requirements are similar across teams, however, in order to better serve the application teams that depend on reporting the time has come to rethink reportings role inside of Kibana, and how we can scale it across our product suite.

# Detailed design

## REST API

Though we plan to support additional functionality longer-term (for instance a client-api or support for scheduling), the initial product will solely be a REST API involving a 4 part life-cycle:

1. Starting a new job.
2. Querying a job's status.
3. Downloading the job's results.
4. Deleting a job

Reporting will return a list of HTTP codes to indicate acceptance or rejection of any HTTP interaction:

**Possible HTTP responses**

`200`: Job is accepted and is queued for execution

`204`: OK response, but no message returned (used in DELETE calls)

`400`: There was a malformation of the request, and consumers should review the returned message

`403`: The user is not allowed to create a job

`404`: Job wasn't found

`401`: The request isn't properly authorized

### 1. Starting a new job

The primary export type in this phase will be a PDF binary (retrieved in Step 3). Registering can be as complex as below:

```sh
curl -x POST http://kibana-host:kibana-port/api/reporting/pdf
[{
  “baseUrl”: “/my/kibana/page/route?page=1&reporting=true”,
  "waitUntil": {
    "event": “complete”,
  },
  “viewport”: {
    “width”: 1920,
    “height”: 1080,
    "scale": 2
  },
  "mediaType": "screen",
  "timeout": 30000,
}, {
  “baseUrl”: “/my/kibana/page/route?page=2&reporting=true”,
  "waitUntil": {
    "event": “complete”,
  },
  “viewport”: {
    “width”: 1920,
    “height”: 1080,
    "scale": 2
  },
  "mediaType": "screen",
  "timeout": 30000,
}]
```

In the above example, a consumer posts an array of URLs to be exported. When doing so, the assumption here is that the pages relate to each other in some fashion (workpad's in Canvas, for instance), and thus can be optimized by using the page and browser objects. It should be noted that even though we're given a collection of pages to export that *they'll be rendered in series and not parallel*.

`baseUrl: string`: The URL of the page you wish to export, relative to Kibana's default path. For instance, if canvas wanted to export a page at `http://localhost:5601/app/canvas#/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1`, the `baseUrl` would be `/app/canvas#/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1`. This is done to prevent our chromium process from being "hijacked" to navigate elsewhere. You're free to do whatever you'd like for the URL, including any query-string parameters or other variables in order to properly render you page for reporting. For instance, you'll notice the `reporting=true` param listed above.

`waitUntil: { event: string; selector: string }`: An object, specifying a custom `DOM` event to "listen" for in our chromium process, or the presence of a DOM selector. Either options are valid, however we won't allow for both options to be set. For instance, if a page inserts a `<div class="loaded">` in its markup, then the appropriate payload would be:

```json
"waitUntil": {
  "selector": "div.loaded",
},
```

`viewport: { width: number; height: number; scale: number }`: Viewport will allow consumers the ability to make rigid dimensions of the browser, such that the formatting of their pages sized appropriately. Scale, in this context, refers roughly to pixel density if there's a need for a higher resolution. A page that needs high-resolution PDF, could set this by:

```json
“viewport”: {
  “width”: 1920,
  “height”: 1080,
  "scale": 2
},
```

`mediaType: "screen" | "print"`: It's often the case that pages would like to use print media-queries, and this allows for opting-in or out of that behavior. For example, if a page wishes to utilize its print media queries, a payload with:

```json
"mediaType": "print"
```

`timeout: number`: When present, this allows for consumers to override the default reporting timeout. This is useful if a job is known to take much longer to process, or supporting our users without requiring them to restart their Kibana servers for a simple configuration change. Value here is milliseconds.

```json
"timeout": 60000
```

**Full job creation example:**

```curl
curl -x POST http://localhost:5601/api/reporting/pdf
[{
  “baseUrl”: “/my/kibana/page/route?page=1&reporting=true”,
  "waitUntil": {
    "event": “complete”,
  },
  “viewport”: {
    “width”: 1920,
    “height”: 1080,
    "scale": 2
  },
  "mediaType": "screen",
  "timeout": 30000,
}, {
  “baseUrl”: “/my/kibana/page/route?page=2&reporting=true”,
  "waitUntil": {
    "event": “complete”,
  },
  “viewport”: {
    “width”: 1920,
    “height”: 1080,
    "scale": 2
  },
  "mediaType": "screen",
  "timeout": 30000,
}]

# Response (note the single ID of the response)
# 200 Content-Type application/json
{
  "id": "123"
}
```

### 2. Querying and altering a job's status.

Once created, a user can simply issue simple GET call to see the status of the job.

**Get a job's status:**

```curl
curl -x GET http://localhost:5601/api/reporting/123/status

# Response
# 200 Content-Type application/json
# We might provide other meta-data here as well when required
{
  "status": "pending",
  "elapsedTime": 12345
}
```

Possible types for `status` here are: `pending`, `running`, `complete`, `complete-warnings`, `failed`, or `timedout`. We can add more detail here if needed, such as the current URL being operated or whatever other information is valuable to consumers.

### 4. Deleting a job

A DELETE call will remove the report. If a report is in pending/running state, this will attempt to terminate the running job. Once a report is complete, the call to delete will permanently (hard delete) remove the job's output in ElasticSearch.

When successfully deleted, reporting will simply respond with a `204` HTTP code, indicating success.

```curl
curl -x DELETE http://localhost:5601/api/reporting/123

# Response (no body, 204 indicates success)
# 204 Content-Type text/plain;charset=UTF-8
```

# Drawbacks

Due to the new nature of this RFC, there are definitely drawbacks to this approach short-term. These short-term drawbacks become miniscule longer-term, since the work being done here frees both reporting and downstream teams to operate in parallel.

- Initial work to build this pipeline will freeze some current efforts (scheduled reports, etc).
- Doesn't solve complex architectural issues experienced by our customers.
- Requires work to migrate our existing apps (Canvas, dashboard, visualizations).
- Doesn't offer any performance characteristics over our current implementation.

Though there's some acute pain felt here shorter term, they pale in comparison to building custom ad-hoc solutions for each application inside of Kibana.

# Alternatives

Going through the process of developing this current RFC, we did entertain a few other strategies:

## No changes in how we operate

This strategy doesn't scale beyond the current two team members since we field many support issues that are application-specific, and not reporting specific. This keeps our trajectory where it currently is, short term, but hamstrings us longer term. Unfortunately, for teams to have the best experience with regards to reporting, they'll need to have ownership on the rendering aspects of their pages.

## A new plugin

We debated offering a new plugin, or having apps consume this type of service as a plugin, but ultimately it was too much overhead for the nature of what we're offering. More information on the prior RFC is here: https://github.com/elastic/kibana/pull/59084.

## Each page builds its own pipeline

This would allow teams to operate how they best see fit, but would come with a host of issues:

- Each team would need to ramp up on how we handle chromium and all of its sharp edges.
- Potential for many requests to be in flight at once, causing exhaustion of resources.
- Mixed experience across different apps, and varying degrees of success.
- No central management of a users general reports.

# Adoption strategy

After work on the service is complete in its initial phase, we'll begin to migrate the Dashboard app over to the new service. This will give a clear example of:

- Moving a complex page over to this service.
- Where the divisions of labor reside (who does what).
- How to embed rendering-specific logic into your pages.

Since reporting only exists on a few select pages, there won't be need for a massive migration effort. Instead, folks wanting to move over to the new rendering service can simply take a look at how Dashboard handles their exporting.

In short, the adoption strategy is fairly minimal due to the lack of pages being reported on.

# Unresolved questions

- How to troubleshoot complex customer environments?
- When do we do this work?
- Nuances in the API, are we missing other critical information?
