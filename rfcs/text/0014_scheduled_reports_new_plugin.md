- Start Date: 2020-11-30
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

With the ever-growing needs of Kibana to get data "out" to our users, so grows the responsibility of reporting and its current implementation. Historically, reporting was a "bolt-on" appliance custom built for specific pages, and wasn't a re-usable library allowing any page (or plugin) the ability to incorporate reports. Because of this approach, reporting doesn't scale well both for the owning team and its consumers, and this imbalance has grown to the point that it needs to be addressed.

It's with these motivations in mind that reporting should now operate as a plugin, imported and used via platform APIs, so that Kibana pages and plugins can be reported-on in a more formal way.

# Motivation

At several points in the past, the team behind reporting has tried to formalize a mechanism that allows Kibana pages to be exported in a self-service fashion, but has had significant hardships in doing so. Part of these hardships are external to the team, but a lot of them are internal:

- Numerous page-specific behaviors are embedded into our codebase.
- No formal API on how to make pages themselves "exportable."
- A convoluted REST API that doesn't lend itself well to being re-usable.
- Requires at least two teams in order to integrate new pages.

With the desire to build more sophisticated features, such as scheduled reports, the time has come to rethink how reporting operates so that page-specific behaviors belong to their respective owners. We see ownership start to become more concrete once we make the following statements:

- Rendering characteristics of a page (Dashboards, for instance) should be maintained and owned by that team.
- The general pipeline of reporting: queueing, export execution, browser binaries, persistance of assets, and the REST APIs are owned by the reporting team.
- Other characteristics, such as licensing and role's, can be established in one (or both) places.

At its core, we want to expand upon the features and fixes that can make reporting a killer-feature of Kibana. In order to do so, it's time to shed the maintenance cost and upkeep of application-specific logic to the underlying team's themselves.

# Overall design

The new plugin would follow Kibana's recommended and best practices: establishing a TypeScript-based plugin that others can add as a dependency and consume. The following is a brief overview of how an application would incorporate reporting into their application stack.

## 1. Add a dependency on reporting
In order to use reporting, a plugin simply has to add a dependency on reporting in their `kibana.json`:

```json
{
  "id": "super-dashboards",
  "version": "8.0.0",
  "kibanaVersion": "kibana",
  "optionalPlugins": ["reporting"],
  "server": true,
  "ui": true
}
```

Now that `reporting` is added as a plugin, downstream plugins can now integrate reporting into their stack.

## 2. Using the plugin

Similar to other plugins, reporting will offer a module that allows consumers to define the types and kinds of reports allowed by the page. For example, the below call will register a new "PDF" report to the page:

```js
// plugin.ts server
public setup(core: CoreSetup, plugins: PluginSetup) {
  const { reporting } = plugins;

  reporting.registerReport({
    id: Symbol('super-dashboard-report'),
    tags: ['super-dashboard', 'triple-word-score', 'synergy'],
    type: 'pdf',
    label: 'Export Dashboard',
    visibility: 'user',
    intervals: ['immediate', 'monthly', 'weekly'],
    connectors: ['email', 'slack'],
    before: (req, res, context): Promise<boolean> => {},
    after: (result: Buffer) => void,
  });
}

// plugin.ts public
public start(core: CoreStart, plugins: PluginStart) {
  const { reporting } = plugins;
  const dashboardReports = reporting.findReportById(Symbol('super-dashboard-report'));
}

// Later, in some React component:
<Button onClick={() => dashboardReports.open(`http://localhost:5601/my-dope-dashboard?pdf-export=true`)}>
```

Care should be taken, in the final API design, to strike a good balance between what reporting takes ownership of, and the page/application itself. For instance, adding the Button to the page is likely something that application owners will want to control, but not re-creating the entire scheduling interface. Once consensus has been established on the overall design we'll revisit this handover and devise what belongs where.

## 3. Full parameters

Most of the pipeline aspects of reporting should belong in reporting's own configuration instance. Timeouts, retries, and ElasticSearch-level mechanics are reporting-specific configurations and belong there. Options such as asset-type's, permissioning, and even licensing, are ones that application owners are allowed to configure on their own terms. Because of this separation, we've decided that a registration phase is the most appropriate for designating these behaviors. Below is a beginning type-declaration for the `registerReport` function:

```ts
interface IRegisterReportOptions {
  // Unique ID to identify the job
  id: string;

  // List of arbitrary tags to perform filtering for in reporting's UI
  tags: string[];

  // The desired type of asset once complete
  type: 'pdf' | 'png' | 'csv';

  // TBD: The label of the button on the page ("Export Page")
  label: string;

  // Enumerable of "who" can see/download the report.
  visibility: 'user' | 'public';

  // Available intervals of exporting, 'immediate' equating to what we currently have now
  intervals: Array<'immediate' | 'monthly' | 'weekly' | 'daily'>;

  // A list of connectors to use for exporting
  connectors: Array<'email' | 'slack' | 'iqcu'>;

  // A before hook function that gets the full context of the server-side request. Returns a true/false indicating whether or not to proceed.
  before: (context: RequestHandlerContext, req: KibanaRequest, res: KibanaResponse) => Promise<boolean>;

  // A post-request hook that allows altering or viewing the produced asset, as a buffer, of the job.
  after: (result: Buffer) => void;
}

interface IReportingClient {
  // Open triggers the generation report UI to open, and if it's configurable to be scheduled, that UI as well.
  // The argument here is _where_ the asset is located (either a fully-qualified URL or saved-object ID).
  open: (urlOrObjectID: string) => void;

  // Simply close the report generation panel.
  close: () => void;
}
```

## 4. Render your page properly

In cases where a report is a rasterized asset (PDF or PNG), your page should take care of when and how this happens. For instance, if your page is located at:

```
https://www.kibana-is-cool.com/my-dope-kibana-page-a-rama
```

Then, setting a URL-based argument might make sense in your hook:

```
https://www.kibana-is-cool.com/my-dope-kibana-page-a-rama?pdf=true
```

Having something to distinguish whether a page is being exported, or simply rendered as usual, is critical and allows page owners to make conditional decisions based upon that predicate. For instance, app owners can (and should) disable "first-time" wizards, telemetry, and anything else expecting user interactions (modals/prompts/buttons/etc). The browser that reporting uses will appear as a "first-time" user with no cache or cookies set.

## 5. ... Wait

After a report has been submitted, either via a user-initiated action or a programmatic one (not covered in this RFC), reporting will function like it generally has. Changes here are purely internal to the team, and don't require commentary since the implementation isn't of concern to consumers. Once complete, a toast-notification is trigger with a link to download the report (in the case of immediate intervals, or simple no-connector) and a link to the Reporting page. For scheduled reports, a simple success notification is generated at the start to give notice to the user that the report will begin at the requested interval.

## 6. Downloads and exploration of prior reports

Aside from the creation aspect, reporting will continue to own the reading, updating, and deleting of prior-run reports. These actions will continue to reside in our section of the Management are, and future RFCs/development will be required for performing these operations outside of reportings administration page.

# Drawbacks

While migrating reporting to be plugin-oriented presents a good way to delineate ownership, there's a few downsides as well.

- Re-architect how reporting works so that it can operate as plugin versus a standalone plugin.
- Migration of code into the relevant apps/plugins.
- No tangible features or performance improvements: this is purely a refactor internally.
- Documenting and evangelizing of this new procedure.
- Potential breaking of 3rd party plugins once we extract page-level behaviors.

This list is in combination with all of the other known issues regarding rewrite-or-refactoring.

# Alternatives

The only alternative that comes to mind is integrating future pages and features into our plugin's codebase. This gets us further in the short-term, but presents dramatic costs longer-term as a higher headcount and staffing will be needed to ensure reporting continues to operate normally plus add new features.
