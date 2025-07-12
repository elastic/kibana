---
navigation_title: "Kibana"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/release-notes.html
  - https://www.elastic.co/guide/en/kibana/current/whats-new.html
---

# Kibana release notes [kibana-release-notes]

Review the changes, fixes, and more in each version of Kibana.

To check for security updates, go to [Security announcements for the Elastic stack](https://discuss.elastic.co/c/announcements/security-announcements/31).

% Release notes include only features, enhancements, and fixes. Add breaking changes, deprecations, and known issues to the applicable release notes sections.

% ## version.next [kibana-X.X.X-release-notes]

% ### Features and enhancements [kibana-X.X.X-features-enhancements]
% *

% ### Fixes [kibana-X.X.X-fixes]
% *

## 9.1.0 [kibana-9.1.0-release-notes]

### Features and enhancements [kibana-9.1.0-features-enhancements]

**Dashboards and Visualizations**:
* Adds internal CRUD api routes in *Lens* [#223296]({{kib-pull}}223296).
* Enable read only editor mode to inspect panel's configuration in *Lens* [#208554]({{kib-pull}}208554).
* Shiny add panel highlight [#223614]({{kib-pull}}223614).
* Favorite a dashboard from within [#201596]({{kib-pull}}201596).

**Data ingestion and Fleet**:
* Adds bulk migrations UI [#224334]({{kib-pull}}224334).
% !!TODO!! The above PR had a lengthy release note description:
% Added the ability to migrate bulk agents to another cluster via the bulk actions menu of the agent list table (experimental).
* Enable tabular integrations UI feature flag [#222842]({{kib-pull}}222842).
* Single agent migration UI [#222111]({{kib-pull}}222111).
% !!TODO!! The above PR had a lengthy release note description:
% Added the ability to migrate a single agent to another cluster via the actions menu in Fleet. Users can enter a remote cluster URL and enrollment token, as well as customize additional parameters in order to migrate an agent.
* Adds single agent migration endpoint [#220601]({{kib-pull}}220601).
% !!TODO!! The above PR had a lengthy release note description:
% Added endpoint allowing a user to migrate an individual agent to another cluster by specifying the URL and Enrollment Token. Note: tamper protected and fleet agents can not be migrated and attempting to do so will return a `403` status code.
* Adds integration flyout [#220229]({{kib-pull}}220229).
* Enable feature flag enableSyncIntegrationsOnRemote [#220215]({{kib-pull}}220215).
* Adds Edit ReadMe Functionality To Custom Integrations [#215259]({{kib-pull}}215259).
% !!TODO!! The above PR had a lengthy release note description:
% Adds edit functionality to custom integrations, allowing a user to edit the README file of a custom integration and save it to be persisted. Additionally, saving will automatically increment the version of the integration and update all associated policies.
* Adds ssl fields to agent binary source settings [#213211]({{kib-pull}}213211).
* Expose ssl options for ES and remote ES outputs in UI [#208745]({{kib-pull}}208745).
* Adds SSL options to fleet server hosts settings [#208091]({{kib-pull}}208091).
* Adds action to Add tags to Agent details page [#225433]({{kib-pull}}225433).
* Support agentless traffic filters [#222082]({{kib-pull}}222082).
* Fleet agents tag filter is searchable and sorted [#219639]({{kib-pull}}219639).
* Callout breaking changes on integration upgrade [#217257]({{kib-pull}}217257).
* Adds msi installer command for fleet server and agents [#217217]({{kib-pull}}217217).
* Optional ssl for fleet logstash output [#216216]({{kib-pull}}216216).
* Format last activity value in fleet agent details view as datetime [#215531]({{kib-pull}}215531).
* Support `searchAfter` and PIT (point-in-time) parameters for get agents list API [#213486]({{kib-pull}}213486).
* Register custom integrations search provider [#213013]({{kib-pull}}213013).

**Discover**:
* Apply compact Display options Popover layout [#210180]({{kib-pull}}210180).

**Elastic Observability solution**:
For the Elastic Observability 9.1.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Machine Learning**:
* Moves job and trained model management features into Stack Management [#204290]({{kib-pull}}204290).
* Update NL-2-ESQL docs [#224868]({{kib-pull}}224868).
* Anomaly Explorer: New severity colors alignment & New UX for filtering anomalies [#221081]({{kib-pull}}221081).

**Platform**:
* Added an option to User Settings that allows the Kibana interface to display in a high contrast mode [#216242]({{kib-pull}}216242).

**Search**:
* Adds Search Home page in Stack Classic and Solution navigation [#225162]({{kib-pull}}225162).
* Create a home page in serverless env [#223172]({{kib-pull}}223172).
* Updates the side navigation for Serverless Elasticsearch streamlining available options [#225709]({{kib-pull}}225709).
* Updated the Elasticsearch solution navigations and elasticsearch classic navigation items available [#224755]({{kib-pull}}224755).
* Navigation for Overview Page in Entity Analytics [#221748]({{kib-pull}}221748).
* Adds 'page reload' screen reader warning [#214822]({{kib-pull}}214822).


### Fixes [kibana-9.1.0-fixes]

**Dashboards and Visualizations**:
* Hide Select All checkbox from single select controls [#226311]({{kib-pull}}226311).
* Remove kebab case warnings [#226114]({{kib-pull}}226114).
* Small visual fixes [#225430]({{kib-pull}}225430).

**Data ingestion and Fleet**:
* Ensure package policy names are unique when moving across spaces [#224804]({{kib-pull}}224804).
* Fixes ssl config overridden from advanced yaml in full agent policy [#219902]({{kib-pull}}219902).
* Fixes capability required for Siem Migrations Topic [#219427]({{kib-pull}}219427).
* Make output and fleet server non-editable for agentless policies [#218905]({{kib-pull}}218905).
* Support integrations having secrets with multiple values [#216918]({{kib-pull}}216918).
* Adds remote cluster instructions for syncing integrations [#211997]({{kib-pull}}211997).
* Update install snippets to include all platforms [#210249]({{kib-pull}}210249).

**Discover**:
* Fixes row highlight when reordering columns [#226584]({{kib-pull}}226584).
* Left align content inside the rendered cell value [#226562]({{kib-pull}}226562).
* Adds items count to fields accordion title aria-label [#216993]({{kib-pull}}216993).
* Discover esc closes flyout when focus is on filter [#216630]({{kib-pull}}216630).

**Elastic Observability solution**:
For the Elastic Observability 9.1.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Custom link colour option for top banner [#214241]({{kib-pull}}214241).
* Change in sortBy dropdown component option name wording [#206464]({{kib-pull}}206464).

**Machine Learning**:
* Fixes overflow of cards in Machine Learning Overview page [#223431]({{kib-pull}}223431).
* Automatic Import now produces correct pipeline to parse CSV files with special characters in column names [#212513]({{kib-pull}}212513).

## 9.0.3 [kibana-9.0.3-release-notes]

:::{important}
The 9.0.3 release contains fixes for potential security vulnerabilities. Check our [security advisory for more details](https://discuss.elastic.co/c/announcements/security-announcements/31).
:::

### Features and enhancements [kibana-9.0.3-features-enhancements]

**Elastic Observability solution**:
For the Elastic Observability 9.0.3 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.0.3 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).


### Fixes [kibana-9.0.3-fixes]

**Alerting**:
* Fixes an issue that caused {{kib}} to repeatedly restart when `xpack.alerting.cancelAlertsOnRuleTimeout` was set to `false` in the `kibana.yml` file [#222263]({{kib-pull}}222263).
* Resolves multiple issues in the Watcher UI that were introduced in 8.18.0, 8.18.1, 9.0.0, and 9.1.0. This includes the table not displaying more than 10 watches, an error banner appearing unexpectedly in certain scenarios, and the search bar functionality not working as expected [#223898]({{kib-pull}}223898).

**Dashboards and Visualizations**:
* Fixes an issue that prevented navigating through pages when inspecting a chart's data  [#217937]({{kib-pull}}217937).

**Discover**:
* In version 9.0.0, we changed the way time ranges are handled for Discover ES|QL CSV exports ([#216792]({{kib-pull}}216792)). We realized that this change caused an issue with CSV Post URLs now using an absolute time range instead of a relative one, leading to duplicate reports being generated. We've reverted this change while we investigate different solutions [#223249]({{kib-pull}}223249).
* The request URL now appears correctly again when inspecting an ES|QL request [#221816]({{kib-pull}}221816).

**Elastic Observability solution**:
For the Elastic Observability 9.0.3 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.0.3 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Machine Learning**:
* Ensures the {{bedrock}} connector respects the action proxy configuration [#224130]({{kib-pull}}224130).
* Ensures the OpenAI connector respects the action proxy configuration for all sub-actions [#219617]({{kib-pull}}219617).
* Allows you to add additional fields even if your ingest pipeline is empty when uploading a file [#222775]({{kib-pull}}222775).

## 9.0.2 [kibana-9.0.2-release-notes]

### Enhancements [kibana-9.0.2-features-enhancements]
**Elastic Observability solution**:
For the Elastic Observability 9.0.2 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).


### Fixes [kibana-9.0.2-fixes]
**Alerting**:
* Fixes ignored dynamic templates [#219875](https://github.com/elastic/kibana/pull/219875).
* Fixes an issue where notifications would not trigger after the expiration of maintenance windows on active alerts [#219797](https://github.com/elastic/kibana/pull/219797).

**Dashboards**:
* When adding a panel using **Add from library**, the interface now shows a success message and scrolls the dashboard to the added panel [#220122](https://github.com/elastic/kibana/pull/220122).

**Elastic Observability solution**:
For the Elastic Observability 9.0.2 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.0.2 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).



## 9.0.1 [kibana-9.0.1-release-notes]

::::{important}
The 9.0.1 release contains fixes for potential security vulnerabilities. See our [security advisory](https://discuss.elastic.co/c/announcements/security-announcements/31) for more details.
::::

### Enhancements [kibana-9.0.1-features-enhancements]
**Data ingestion and Fleet**:
* Reuse shared integration policies when duplicating agent policies [#217872](https://github.com/elastic/kibana/pull/217872).

**Elastic Security solution**:
For the Elastic Security 9.0.1 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).


### Fixes [kibana-9.0.1-fixes]
**Dashboards & Visualizations**:
* When exploring a dashboard, the request inspector now shows the correct request and response in any successful scenario [#216519](https://github.com/elastic/kibana/pull/216519).
* Correctly synchronize the dashboard ES|QL query and filters with the corresponding visualization query in **Lens** [#218997](https://github.com/elastic/kibana/pull/218997).
* Fixes an issue where keywords could be incorrectly formatted in a metric visualization [#218233](https://github.com/elastic/kibana/pull/218233).

**Discover**:
* Fixes incorrect behavior for requests on fields where the *Allow hidden and system indices* (`allow_hidden`) option of the data view could be ignored [#217628](https://github.com/elastic/kibana/pull/217628).

**Elastic Observability solution**:
For the Elastic Observability 9.0.1 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.0.1 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Fixes broken icons in integrations coming from the Home plugin [#219206](https://github.com/elastic/kibana/pull/219206).
* Fixes placeholder disappearing when a value is set in the Monaco code editor [#217828](https://github.com/elastic/kibana/pull/217828).

**Machine Learning**:
* Fixes an issue that could cause a page loading error to show when changing between Inference endpoints services [#219020](https://github.com/elastic/kibana/pull/219020).
* Fixes missing field names in the step details of the anomaly detection job wizards [#218570](https://github.com/elastic/kibana/pull/218570).



## 9.0.0 [kibana-900-release-notes]

If you're upgrading to version 9.0.0, you first need to upgrade to version 8.18. We recommend checking the [8.18 release notes](https://www.elastic.co/guide/en/kibana/8.18/release-notes-8.18.0.html).

### Features and enhancements [kibana-900-features-enhancements]

**Theme**:

{{kib}} 9.0 introduces a more modern and refined look and feel. This new theme brings a vibrant color palette, improved dark mode support (including honoring your system preferences), and more that will bring your data in Kibana to life.

**Data ingestion and Fleet**:
* New setting allowing automatic deletion of unenrolled agents in Fleet settings [#195544]({{kib-pull}}195544).
* Improves filtering and visibility of `Uninstalled` and `Orphaned` agents in Fleet, by differentiating them from `Offline` agents [#205815]({{kib-pull}}205815).
* Introduces air-gapped configuration for bundled packages [#202435]({{kib-pull}}202435).
* Updates removed parameters of the Fleet -> Logstash output configurations [#210115]({{kib-pull}}210115).
* Updates max supported package version  [#196675]({{kib-pull}}196675).

**Elastic Observability solution**:
* Alerting rules:
  * Adds the reason message to the rules recovery context [#211411]({{kib-pull}}211411).
* SLOs:
  * Split Up SLO Details from Overview. Static data that describes the SLO definition has been moved to a separate tab, making charts and valuable information about SLIs faster to access. [#212826]({{kib-pull}}212826).
  * SpaceId can now be referenced in document-based access filters for roles to restrict a user's access to SLI data for spaces where they do not have access [#214278]({{kib-pull}}214278).
  * Adds a link to the location badge on synthetics SLOs that sends to the Monitors page with a filter applied that matches the location of the origin SLO [#210695]({{kib-pull}}210695).
* Synthetics:
  * Ensures 404 is returned only if `screenshot_ref` is truly not present [#215241]({{kib-pull}}215241).

**Elastic Security solution**:
* For the Elastic Security 9.0.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana security**:
* Updates `js-yaml` to `4.1.0` [#190678]({{kib-pull}}190678).

**Machine Learning**:
* Removes use of `ignore_throttled` [#199107]({{kib-pull}}199107).

**Platform**:
* Adds warning header to deprecated API endpoints [#205926]({{kib-pull}}205926).
* Sets HTTP2 as default if SSL is enabled and adds deprecation log if SSL is not enabled or protocol is set to HTTP1 [#204384]({{kib-pull}}204384).


### Fixes [kibana-900-fixes]

**Dashboards & Visualizations**:
* Fixes an issue in Lens where colors behind text were not correctly assigned, such as in `Pie`, `Treemap` and `Mosaic` charts [#209632]({{kib-pull}}209632).
* Fixes an issue where changing the *Ignore timeout results* control setting wasn't taken into account [#208611]({{kib-pull}}208611).
* Force returns 0 on empty buckets on count if `null` flag is disabled [#207308]({{kib-pull}}207308).
* Fixes infinite loading time for some charts due to search context reload [#203150]({{kib-pull}}203150).

**Data ingestion and Fleet**:
* Fixes overlay for Integrations on mobile [#215312]({{kib-pull}}215312).
* Update minimum package spec version to 2.3 [#214600]({{kib-pull}}214600).
* Fixes a validation error happening on multi-text input fields [#205768]({{kib-pull}}205768).

**Elastic Observability solution**:
* Alerting rules:
  * Fixes chat on the Alerts page [#197126]({{kib-pull}}197126).
* Infrastructure Inventory:
  * Fixes an error that could prevent the Observability Infrastructure Inventory view from loading after an upgrade due to missing versioning on inventory_view_saved_object [#207007]({{kib-pull}}207007).
* SLOs:
  * Fixes an issue where clicking on the name badge for a synthetics monitor on an SLO details page would lead to a page that failed to load monitor details [#210695]({{kib-pull}}210695).
  * Allows use of wildcard filters in SLO queries when DSL filters are also used [#213119]({{kib-pull}}213119).
  * Ensures that when an SLO is created, its ID is correctly verified to be unique across all spaces [#214496]({{kib-pull}}214496).

**Elastic Security solution**:
* For the Elastic Security 9.0.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Platform**:

* Fixes several interface inconsistencies on the Space creation and settings pages [#197303]({{kib-pull}}197303).