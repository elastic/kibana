- Start Date: 2020-10-15
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Scheduled reports is a new feature coming soon to Kibana. At a broad-level, this will allow our users to generate reports on a regular interval automatically -- and receiving those reports via some external mechanism.

This RFC is an attempt to garnish feedback amongst Kibana developers about the possibility of writing this new feature as a standalone plugin, or to incorporate it into the existing one.

# Motivation

At several points in the past, the team behind reporting has tried to implement this feature but has had significant hardships in doing so. Part of these hardships are external to the team, but a lot of them are internal:

- Our current queueing mechanism doesn't allow for jobs to be ran on a regular interval, only once.
- The credentials we use to run reports on our user's behalf aren't long-lived and will fail after a certain period.
- Reporting job's themselves have some implementation concerns embedded into them with regards to queueing, making them less portable.

Writing scheduled reports as a new plugin can also provide us with an opportunity to fix long standing technical issues and ownership boundaries.

- Our PDF generation process requires numerous snapshots of the page, and generating the PDF in memory, versus using native headless PDF methods.
- A lot of logic is embedded in the reporting stack that belongs elsewhere. [Prior RFCs were established for this here](https://github.com/elastic/kibana/pull/64372), and this new plugin provides us an opportunity to work on this as well.
- Generating larger reports has been a historic challenge in cloud environments, and a new plugin would allow us to explore more streamlined methods without risking a breakages in our current plugin.

At it's core, our motivation is to get this feature shipped without further delay. Prior projects that were similar in level's of effort have often been delivered near (or after) internal deadlines. Our movement to Kibana's new platform is a good example.

# Overall design

The new plugin would follow Kibana's recommended and best practices, use API Keys internally, as well as TaskManager for orchestrating and running of reporting jobs. At creation, reporting would:

1. Validate the request, license, and user permission levels -- making use of the new platform features.
2. If a request is indeed valid, a Task is registered into Task Manager, and some meta data pertaining to the job is recorded in our own index.
3. At job execution time, reporting would use the metadata from the job to execute the work required. [More details can be found here](https://github.com/elastic/kibana/pull/64372).
    1. Any logic needed to render properly should be embedded into the page being reported.
    2. Once rendering is complete in our headless browser, a PDF or PNG of the page is captured.
    3. At no point should our reporting plugin "inject" custom CSS or JS in order to export the page.
4. Once complete, the report is captured into ElasticSearch.
5. The report is then exported via the connector chosen in Step 1.

After some period of time, gauging stability and overall hardiness, we should endeavor to migrate the older reporting plugin's behavior to the fundamentals in the newly created one. Our intention isn't to create and manage two separate plugins, but create a plugin that can support all use cases without having to make massive changes to our current plugin.

Of course this strategy isn't without its shortcoming.

# Drawbacks

While authoring a new plugin allows us a chance to create from the ground-up, there's significant potentials for failure.

- The current plugin has many historical issues fixed and implemented, and writing a new plugin means we're potentially susceptible to those.
- We expose ourselves to a perilous period of time where we have to support both plugins, making the cost of ownership much higher.
- A lot of ambition and planning is conflated into this strategy: we're lumping in technical debt, writing new features, and implementing new platform features. Given the goals, there's greater risk of failure.
- Good deals of work on preparing the code base will, effectively, be for naught as we'll likely not reuse much of the current implementation.

This list is in combination with all of the other known issues regarding rewrite-or-refactoring.

# Alternatives

The only alternative is to use our current implementation and make every effort to finish it. This has been the current strategy thus far, but has been challenging due to the amount of work required to prepare our plugin and make it scheduling ready.
