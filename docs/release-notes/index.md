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

If you're upgrading to version 9.1.0, you first need to upgrade to version [8.19](https://www.elastic.co/guide/en/kibana/8.19/release-notes-8.19.0.html) or [9.0](#900-kibana-900-release-notes).

### Features and enhancements [kibana-9.1.0-features-enhancements]

**Alerting**:
* Added the ability to schedule reports with a recurring schedule and view previously scheduled reports [#224849]({{kib-pull}}224849).
* Cases analytics index [#223405]({{kib-pull}}223405).
% !!TODO!! The above PR had a lengthy release note description:
% Four dedicated case analytics indexes were created, allowing users to build dashboards and metrics over case data. These indexes are created on Kibana startup and updated periodically with cases, comments, attachments, and activity data.
* New kibana setting `xpack.actions.email.services.enabled` to enable/disable email services for email connector [#223363]({{kib-pull}}223363).
* New `xpack.actions.webhook.ssl.pfx.enabled` config [#222507]({{kib-pull}}222507).
% !!TODO!! The above PR had a lengthy release note description:
% New `xpack.actions.webhook.ssl.pfx.enabled` Kibana setting to disable Webhook connector PFX file support for SSL client authentication
* `xpack.actions.email.services.ses.host/port` kibana config [#221389]({{kib-pull}}221389).
% !!TODO!! The above PR had a lengthy release note description:
% New AWS SES Email configuration options `xpack.actions.email.services.ses.host` and `xpack.actions.email.services.ses.port`.
* Scheduled Reports [#221028]({{kib-pull}}221028).
* Support rrule for task scheduling [#217728]({{kib-pull}}217728).
* Publish new public APIs for the Maintenance Window [#216756]({{kib-pull}}216756).
* Alert Delete [#216613]({{kib-pull}}216613).
% !!TODO!! The above PR had a lengthy release note description:
% Added alert cleanup functionality to delete active or inactive (recovered, closed, or untracked) alerts with no status update for a period of time of at least one day
* Added an embeddable panel for Dashboards to display alerts [#216076]({{kib-pull}}216076).
* Report UI should only show reports generated in the current space [#221375]({{kib-pull}}221375).
* Moves rule settings to a flyout instead of a modal [#216162]({{kib-pull}}216162).
* Allow users to delete a snooze schedule from a rule using schedule id [#213247]({{kib-pull}}213247).
* Allow users to create a snooze schedule for rule via API [#210584]({{kib-pull}}210584).
* Implement functionality to add observables, procedures and custom fields to alerts for TheHive [#207255]({{kib-pull}}207255).

**Dashboards and Visualizations**:
* Adds internal CRUD api routes in *Lens* [#223296]({{kib-pull}}223296).
* Adds collapsible sections [#220877]({{kib-pull}}220877).
% !!TODO!! The above PR had a lengthy release note description:
% Adds collapsible sections to Dashboard, which allow panels to be grouped into sections that will not load their contents when their assigned section is collapsed.
* Migrate by-term `palettes` to `colorMapping` configs in *Lens* [#220296]({{kib-pull}}220296).
% !!TODO!! The above PR had a lengthy release note description:
% The **Color Mapping** feature is now GA. Previous Lens `palette` definitions are deprecated and will continue to function normally with no visual change to existing visualizations. Toggling off legacy mode will replace the palette with an equivalent color mapping configuration.
* "Compare to" badge for Metric chart in *Lens* [#214811]({{kib-pull}}214811).
* Enable read only editor mode to inspect panel's configuration in *Lens* [#208554]({{kib-pull}}208554).
* [dashboard] Basic keyboard interaction [#208286]({{kib-pull}}208286).
* Shiny add panel highlight [#223614]({{kib-pull}}223614).
* Adds point visibility option for area/line charts in *Lens* [#222187]({{kib-pull}}222187).
* [Data Table] Add settings for data grid density in *Lens* [#220252]({{kib-pull}}220252).
* Flatten grid layout [#218900]({{kib-pull}}218900).
* Adds "Open in lens" in the same tab [#217528]({{kib-pull}}217528).
* Adds ability to open links in *Vega* in new window [#216200]({{kib-pull}}216200).
* Inject / extract tag references [#214788]({{kib-pull}}214788).
* Globe projection [#212437]({{kib-pull}}212437).
* Keeps the chart configuration changes done by the user when changing the query whenever it is possible [#210780]({{kib-pull}}210780).
* Update @elastic/charts to v70, remove legacy time axis support [#210579]({{kib-pull}}210579).
% !!TODO!! The above PR had a lengthy release note description:
% Updates time based charts to use the multi-layer time axis by default, providing a better time window context and improved label positioning.
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
* Enable feature flag `enableAutomaticAgentUpgrades` [#219932]({{kib-pull}}219932).
* Adds Edit ReadMe Functionality To Custom Integrations [#215259]({{kib-pull}}215259).
% !!TODO!! The above PR had a lengthy release note description:
% Adds edit functionality to custom integrations, allowing a user to edit the README file of a custom integration and save it to be persisted. Additionally, saving will automatically increment the version of the integration and update all associated policies.
* Adds ssl fields to agent binary source settings [#213211]({{kib-pull}}213211).
* Adds Cloud Connectors CSPM Support [#212200]({{kib-pull}}212200).
* Expose ssl options for ES and remote ES outputs in UI [#208745]({{kib-pull}}208745).
* Adds SSL options to fleet server hosts settings [#208091]({{kib-pull}}208091).
* Adds action to Add tags to Agent details page [#225433]({{kib-pull}}225433).
* Adds tooltip to Last activity column in Agent list UI [#224850]({{kib-pull}}224850).
* Support agentless traffic filters [#222082]({{kib-pull}}222082).
* Fleet agents tag filter is searchable and sorted [#219639]({{kib-pull}}219639).
* Callout breaking changes on integration upgrade [#217257]({{kib-pull}}217257).
* Adds msi installer command for fleet server and agents [#217217]({{kib-pull}}217217).
* Optional ssl for fleet logstash output [#216216]({{kib-pull}}216216).
* Format last activity value in fleet agent details view as datetime [#215531]({{kib-pull}}215531).
* Support `searchAfter` and PIT (point-in-time) parameters for get agents list API [#213486]({{kib-pull}}213486).
* Register custom integrations search provider [#213013]({{kib-pull}}213013).

**Discover**:
* Display Attributes doc viewer tab for Observability [#222391]({{kib-pull}}222391).
* Show partial results after timeout [#219027]({{kib-pull}}219027).
% !!TODO!! The above PR had a lengthy release note description:
% When an ES|QL query times out (as a result of the `search:timeout` advanced setting), partial results that are available are now shown.
* Creates control by typing a questionmark [#216839]({{kib-pull}}216839).
* Implementing click action for Stacktrace and Degraded Fields on Discover [#214413]({{kib-pull}}214413).
* Added context aware logic for logs view in discover to show Load More… [#211176]({{kib-pull}}211176).
* Expand to fit the query on editor mount [#225509]({{kib-pull}}225509).
* Flip LOOKUP JOIN to GA in docs [#225117]({{kib-pull}}225117).
* Listen to ?_tstart and ?_tend named params [#225054]({{kib-pull}}225054).
* Enable `COMPLETION` in tech preview [#224811]({{kib-pull}}224811).
* Moves fork in tech preview [#224680]({{kib-pull}}224680).
* Suggest all operators in the editor [#223503]({{kib-pull}}223503).
* Better handling of long fields in the editor [#223222]({{kib-pull}}223222).
* Adds shortcuts in the editor [#221331]({{kib-pull}}221331).
* Suggests full text search in our recommendations [#221239]({{kib-pull}}221239).
* Adds full text search to `STATS ... WHERE` [#220691]({{kib-pull}}220691).
* Hide "Selected only" toggle in pages that don't filter by value [#220624]({{kib-pull}}220624).
* Adds an ES|QL control option on the dashboard controls dropdown [#219495]({{kib-pull}}219495).
* Adds 'Copy value' button to field value cells [#218817]({{kib-pull}}218817).
* Enable suggestions for `CHANGE_POINT` command [#218100]({{kib-pull}}218100).
* Autocomplete for `STATS...WHERE` [#216379]({{kib-pull}}216379).
* Validation and autocomplete support for the `CHANGE_POINT` command [#216043]({{kib-pull}}216043).
* Highlights the code examples in our inline docs [#214915]({{kib-pull}}214915).
* Suggest triple quotes when the user selects the `KQL` / `QSTR` [#211457]({{kib-pull}}211457).
* Display a warning and a tooltip for the `_score` column in the grid [#211013]({{kib-pull}}211013).
* Allow command/ctrl click for "New" action in top nav [#210982]({{kib-pull}}210982).
* Apply compact Display options Popover layout [#210180]({{kib-pull}}210180).
* Allows the creation of dynamic aggregations controls for ES|QL charts [#210170]({{kib-pull}}210170).

**Elastic Observability solution**:
For the Elastic Observability 9.1.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Adds unused url cleanup task [#220138]({{kib-pull}}220138).

**Kibana security**:
* Render accordion in integration readme [#223916]({{kib-pull}}223916).
* Adds defaultSolution to spaces config [#218360]({{kib-pull}}218360).

**Machine Learning**:
* Moves job and trained model management features into Stack Management [#204290]({{kib-pull}}204290).
* Update NL-2-ESQL docs [#224868]({{kib-pull}}224868).
* Trained Models: Hides Adaptive Allocations Toggle in Serverless [#224097]({{kib-pull}}224097).
* Adds rare scripts job to preconfigured Security:Windows anomaly detection jobs [#223041]({{kib-pull}}223041).
* Adds new subAction for converse and converseStream for Bedrock [#223033]({{kib-pull}}223033).
* ES|QL pattern formatting [#222871]({{kib-pull}}222871).
* AIOps: Adds ability to disable AIOps features in Kibana [#221286]({{kib-pull}}221286).
* Anomaly Explorer: New severity colors alignment & New UX for filtering anomalies [#221081]({{kib-pull}}221081).
* Trained Models: Prevents download of models already present in other spaces and shows warning [#220238]({{kib-pull}}220238).
* AIOps: Enhances `No Results` state for Change Point Detection [#219072]({{kib-pull}}219072).
* Fixes some OpenAI models not accepting temperature for Inference service [#218887]({{kib-pull}}218887).
* Adds Voyage AI and DeepSeek icons [#216651]({{kib-pull}}216651).
* Anomalies table: Enhances display for anomaly time function values [#216142]({{kib-pull}}216142).
* Trained models: Improves UX for deploy action [#205699]({{kib-pull}}205699).

**Management**:
* These changes add autocompletion for ESQL query requests in Console [#219980]({{kib-pull}}219980).
* Adds loader when datasources are being loaded [#225005]({{kib-pull}}225005).
* Listing and overview page improvements [#223603]({{kib-pull}}223603).
* Significant events view [#220197]({{kib-pull}}220197).
* Remove enablement check in `PUT /api/streams/{id}` for classic streams [#212289]({{kib-pull}}212289).
* Enable `/api/streams/{id}/_group` endpoints for GroupStreams [#210114]({{kib-pull}}210114).
* Update styles for Color formatter to look like a badge [#189391]({{kib-pull}}189391).

**Platform**:
* Create a rule from a dashboard ES|QL visualization [#217719]({{kib-pull}}217719).
% !!TODO!! The above PR had a lengthy release note description:
% Adds the Create alert rule action to ES|QL dashboard panels, usable from the panel context menu or by right-clicking a data point on the visualization. This allows you to generate an alert when the data on the chart crosses a certain threshold.
* Added an option to User Settings that allows the Kibana interface to display in a high contrast mode [#216242]({{kib-pull}}216242).

**Search**:
* Enable query rules by default [#227226]({{kib-pull}}227226).
% !!TODO!! The above PR had a lengthy release note description:
% Added a section to enable add, update and delete Query Rules written on top of Query Rules APIs to easily pin or exclude documents to a query according to criterias you set.
* Adds Search Home page in Stack Classic and Solution navigation [#225162]({{kib-pull}}225162).
* Create a home page in serverless env [#223172]({{kib-pull}}223172).
* Updates the side navigation for Serverless Elasticsearch streamlining available options [#225709]({{kib-pull}}225709).
* Updated the Elasticsearch solution navigations and elasticsearch classic navigation items available [#224755]({{kib-pull}}224755).

**Sharing**:
* Adds the ability to switch between relative and absolute time range [#218056]({{kib-pull}}218056).
* Navigation for Overview Page in Entity Analytics [#221748]({{kib-pull}}221748).
* Indicate if failure store isn't enabled for data stream [#221644]({{kib-pull}}221644).
* Adds executable name tab to TopN view [#224291]({{kib-pull}}224291).
* ES|QL support for partial results [#223198]({{kib-pull}}223198).
* Extend default log pattern on server-side to include error information [#219940]({{kib-pull}}219940).
% !!TODO!! The above PR had a lengthy release note description:
% Kibana logging's pattern layout, used by default for the console appender, will now use a new default pattern layout `[%date][%level][%logger] %message %error`. This will include the error name and stack trace if these were included in the log entry. To opt out of this behavior users can omit the `%error` placeholder from their log pattern config in kibana.yml e.g.:
* Adds 'page reload' screen reader warning [#214822]({{kib-pull}}214822).


### Fixes [kibana-9.1.0-fixes]

**Alerting**:
* Fixes a regression that caused the cases actions to disappear from the detections engine alerts table bulk actions menu [#215111]({{kib-pull}}215111).

**Dashboards and Visualizations**:
* Forward secondary prefix correctly when state value is an empty string (`None` option) in *Lens* [#228183]({{kib-pull}}228183).
* Fixes an issue where a Lens Partition chart (i.e. `Pie`) prevented the user from selecting a legacy palette. in *Lens* [#228051]({{kib-pull}}228051).
* (Accessibility) Dashboard controls should be grouped as a labelled list [#227633]({{kib-pull}}227633).
* Fixes disabled range slider tooltip, clean up delete control button [#227295]({{kib-pull}}227295).
* Fixes secondary metric styles to prevent wrapping in *Lens* [#227234]({{kib-pull}}227234).
* Save button is disabled in case of save error [#227091]({{kib-pull}}227091).
* Hide Select All checkbox from single select controls [#226311]({{kib-pull}}226311).
* Remove kebab case warnings [#226114]({{kib-pull}}226114).
* Skip all references fallback [#225908]({{kib-pull}}225908).
* [Controls] Do not recommend adhoc dataviews [#225705]({{kib-pull}}225705).
* Fixes Lens Embeddable defaultTitle from being overwritten by custom title after reload [#225664]({{kib-pull}}225664).
* Small visual fixes [#225430]({{kib-pull}}225430).
* Fixes panel title sync with saved object when using defaultTitle [#225237]({{kib-pull}}225237).
* Refresh "Values from a query" options on dashboard reload [#225101]({{kib-pull}}225101).
* Fixes a performance issue in the Lens ES|QL charts in case of errors in the query. in *Lens* [#225067]({{kib-pull}}225067).
* Fixes for controls selections causing multiple fetches [#224761]({{kib-pull}}224761).
* Adds saved object version for collapsible sections [#222450]({{kib-pull}}222450).
* Fixes coloring/palette assignment on partition charts in *Lens* [#215426]({{kib-pull}}215426).
* Fixes invalid dashboard displayed as 404 instead of showing validation error [#211661]({{kib-pull}}211661).
* Adds `useCustomDragHandle` prop [#210463]({{kib-pull}}210463).
* Fixes presentation panel styles [#210113]({{kib-pull}}210113).
* Store assignments as raw/serialized values [#207957]({{kib-pull}}207957).
% !!TODO!! The above PR had a lengthy release note description:
% This PR fixes an issue ([#193080](https://github.com/elastic/kibana/issues/193080)) where custom ranges and multi-field values were not correctly colored based on selected color mapping configurations.

**Data ingestion and Fleet**:
* Fixes export CSV in Agent list [#225050]({{kib-pull}}225050).
* Replace call to registry when deleting kibana assets for custom packages [#224886]({{kib-pull}}224886).
* Ensure package policy names are unique when moving across spaces [#224804]({{kib-pull}}224804).
* Fixes bulk actions incorrectly selecting agents with namespaces filter [#224036]({{kib-pull}}224036).
* Revert " Added instructions for installing elastic agent complete" [#223520]({{kib-pull}}223520).
* Fixes styled component theme lookup issue [#221979]({{kib-pull}}221979).
* Fixes ssl config overridden from advanced yaml in full agent policy [#219902]({{kib-pull}}219902).
* Fixes capability required for Siem Migrations Topic [#219427]({{kib-pull}}219427).
* Make output and fleet server non-editable for agentless policies [#218905]({{kib-pull}}218905).
* Support integrations having secrets with multiple values [#216918]({{kib-pull}}216918).
* Adds remote cluster instructions for syncing integrations [#211997]({{kib-pull}}211997).
* Update install snippets to include all platforms [#210249]({{kib-pull}}210249).

**Discover**:
* Fixes wrong validation on expressions between aggregations [#227989]({{kib-pull}}227989).
* Hides lookup index hidden indices from autocomplete [#227819]({{kib-pull}}227819).
* Fixes invalid input highlight in Data View flyout [#226822]({{kib-pull}}226822).
* Fixes search session rename error in dev [#226757]({{kib-pull}}226757).
* Fixes drag & drop when animations are disabled [#226592]({{kib-pull}}226592).
* Fixes row highlight when reordering columns [#226584]({{kib-pull}}226584).
* Return namespaces from update [#226569]({{kib-pull}}226569).
* Left align content inside the rendered cell value [#226562]({{kib-pull}}226562).
* Fixes edited query overwriting when a request is finished [#224671]({{kib-pull}}224671).
* Update aria tags in patterns selected field [#224224]({{kib-pull}}224224).
* Fixes z-index for esql query editor [#222841]({{kib-pull}}222841).
* Fixes in the bucket function signatures [#222553]({{kib-pull}}222553).
* Fixes COALESCE validation [#222425]({{kib-pull}}222425).
* Fixing the suggestions in WHERE after a variable such as ?value [#222312]({{kib-pull}}222312).
* Adds info icon to doc viewer table [#222299]({{kib-pull}}222299).
* Adds skip to next section in field list grouped [#221792]({{kib-pull}}221792).
* Update aria-label in doc viewer table [#221736]({{kib-pull}}221736).
* Change icon of field list when mapping changes from unmapped to mapped [#221308]({{kib-pull}}221308).
* Remove not needed tabindex from svg inside button [#221265]({{kib-pull}}221265).
* Fixes classic and ES|QL switch button a11y issues [#221246]({{kib-pull}}221246).
* Fixes suggestions after triple quote pair [#221200]({{kib-pull}}221200).
* Update aria-label for field type filter [#221090]({{kib-pull}}221090).
* Fixes indexpattern parsing leading to incomplete index pattern values being displayed [#221084]({{kib-pull}}221084).
* Improve discover session input focus behavior [#220876]({{kib-pull}}220876).
* Adds Actions header to unified data table [#220824]({{kib-pull}}220824).
* Fixes rename wrong validation for asterisc in name [#219832]({{kib-pull}}219832).
* Make icon only presentational [#219696]({{kib-pull}}219696).
* Make pin button focusable with keyboard [#219230]({{kib-pull}}219230).
* Fixes the wrong source validation in case of unknown patterns [#218352]({{kib-pull}}218352).
* Fixes editor menus on safari [#218167]({{kib-pull}}218167).
* Fixes the broken tooltip suggestions descriptions [#218067]({{kib-pull}}218067).
* Adds items count to fields accordion title aria-label [#216993]({{kib-pull}}216993).
* Discover esc closes flyout when focus is on filter [#216630]({{kib-pull}}216630).
* Pass app state and global state to locator when redirecting from /stream path [#215867]({{kib-pull}}215867).
* Enables the timepicker if the time params are used with cast [#215820]({{kib-pull}}215820).
* Calculate the query for retrieving the values correctly [#214905]({{kib-pull}}214905).
* Make sure that the variables in the editor are always up to date [#214833]({{kib-pull}}214833).
* Fixes the visibility of the datepicker [#214728]({{kib-pull}}214728).
* Fixes warnings with escaped quotes [#213685]({{kib-pull}}213685).
* Fixes the wrong validation when a named param is used as function [#213355]({{kib-pull}}213355).
* Supports date_nanos in bucket [#213319]({{kib-pull}}213319).
* Exclude Elasticsearch metadata fields from Display in Content Column [#213255]({{kib-pull}}213255).
* Fixes the suggestion problem in where for multiline queries [#213240]({{kib-pull}}213240).
* Suggest triple quotes when the user selects the `KQL` / `QSTR` [#211457]({{kib-pull}}211457).

**Elastic Observability solution**:
For the Elastic Observability 9.1.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Remove listing limit warning [#217945]({{kib-pull}}217945).
* Custom link colour option for top banner [#214241]({{kib-pull}}214241).
* Change in sortBy dropdown component option name wording [#206464]({{kib-pull}}206464).

**Kibana security**:
* Fixed spaces search functionality for spaces created with avatar type as image [#220398]({{kib-pull}}220398).

**Machine Learning**:
* Hides node allocation warning on serverless [#224406]({{kib-pull}}224406).
* Fixes unknown fields not supported in Data Visualizer and Field Statistics [#223903]({{kib-pull}}223903).
* Fixes overflow of cards in Machine Learning Overview page [#223431]({{kib-pull}}223431).
* Change Point Detection: Fixes 'Use full data' button issue which could cause page to crash [#217291]({{kib-pull}}217291).
* Fixes permission to view ML nodes [#215503]({{kib-pull}}215503).
* Fixes chart in single metric anomaly detection wizard [#214837]({{kib-pull}}214837).
* Trained Models: Prevents multiple clicks in Delete Model dialog [#211580]({{kib-pull}}211580).
* Trained Models: Fixes further deployment of models after a failed deployment [#211459]({{kib-pull}}211459).
* AIOps Hides saved query controls [#210556]({{kib-pull}}210556).

**Management**:
* Fixes flyout styles [#228078]({{kib-pull}}228078).
* Fixes Outcome Preview Table so columns always fill width after resize [#226000]({{kib-pull}}226000).
* Adds discernible text for refresh data preview button [#225816]({{kib-pull}}225816).
* Fixes inability to clear Document ID in data view field editor preview [#220891]({{kib-pull}}220891).

**Platform**:
* Passing the correct namespace to migrateInputDocument [#222313]({{kib-pull}}222313).

**Search**:
* Adjusted `z-index` of app menu header to not conflict with the portable dev console [#224708]({{kib-pull}}224708).
* Fixed a bug with the solution nav submenu items when the nav is collapsed [#227705]({{kib-pull}}227705).
* No need to remove a task [#226481]({{kib-pull}}226481).
* Fixes false positive alerts for IM [#225248]({{kib-pull}}225248).
* Apply chunking algorithm for getIndexBasicStats [#221153]({{kib-pull}}221153).
* Automatic Import now produces correct pipeline to parse CSV files with special characters in column names [#212513]({{kib-pull}}212513).
* Improve finding a function [#210437]({{kib-pull}}210437).

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