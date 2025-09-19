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

## 9.0.7 [kibana-9.0.7-release-notes]

### Fixes [kibana-9.0.7-fixes]

**Elastic Security solution**:
For the Elastic Security 9.0.7 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana security**:
* Fixes an issue causing the API Keys Management page to break when trying to load API keys with null names [#234083]({{kib-pull}}234083).

**Search solution**:
* Fixes the Docs Explorer paging information to correctly render bold text instead of escaped HTML [#234079]({{kib-pull}}234079).

## 9.0.6 [kibana-9.0.6-release-notes]

:::{important}
The 9.0.6 release contains fixes for potential security vulnerabilities. Check our [security advisory](https://discuss.elastic.co/c/announcements/security-announcements/31) for more details.
:::

### Features and enhancements [kibana-9.0.6-features-enhancements]

**Dashboards and Visualizations**:
* Improves usability of dashboards when zooming up to 400% [#228978]({{kib-pull}}228978).

### Fixes [kibana-9.0.6-fixes]

**Kibana platform**:
* Fixes the breadcrumb to include a link to the home page when browsing pages from the **{{es}}** section of the navigation [#230270]({{kib-pull}}230270).
* Updates the built-in `reporting_user` role to leverage a new  `reporting_user` reserved privilege [#231533]({{kib-pull}}231533).

**Search**:
* Fixes an incorrect link in the **Build** breadcrumb when navigating to the **Connectors** and **{{es}} indices** pages [#232504]({{kib-pull}}232504).

## 9.0.5 [kibana-9.0.5-release-notes]

### Features and enhancements [kibana-9.0.5-features-enhancements]

**Dashboards and Visualizations**:
* Improves usability of dashboards when zooming up to 400% [#228978]({{kib-pull}}228978).

### Fixes [kibana-9.0.5-fixes]

**Dashboards and Visualizations**:
* Fixes an issue with the plus sign `+` not being properly encoded when it's part of a date math expression [#230469]({{kib-pull}}230469).
* Fixes an issue in Firefox preventing you from scrolling in the Lens editor flyout [#228625]({{kib-pull}}228625).
* Fixes an issue preventing you from saving linked TSVB visualizations when changing data views [#228685]({{kib-pull}}228685).
* Fixes a console error occurring when adding a Region map visualization to a dashboard [#228669]({{kib-pull}}228669).
* Fixes an issue with the dashboard toolbar header not correctly staying visible when opening the Dashboards app from some specific sections of the Classic navigation [#229621]({{kib-pull}}229621).
* Fixes an issue in reports where a PNG or PDF export would offset and clip part of the visualization in Lens [#228603]({{kib-pull}}228603).

**Data ingestion and Fleet**:
* Fixes an issue that could cause some SSL configurations set using the UI to be overridden [#230758]({{kib-pull}}230758).
* Fixes an issue where the SSL configuration isn't properly added to agent policies with pre-configured output types [#230211]({{kib-pull}}230211).
* Fixes agentless integrations using 'organization', 'division', or 'team' data fields being overwritten by package agentless metadata on the agent policy [#230479]({{kib-pull}}230479).
* Adds `azure-blob-storage` and `gcs` inputs to the AGENTLESS_DISABLED_INPUTS list [#229117]({{kib-pull}}229117).

**Discover**:
* Improves performance of breakdown field search [#229335]({{kib-pull}}229335).
* Enables the **Save query** button after making changes [#229053]({{kib-pull}}229053).
* Fixes the field being picked for fetching stats in the sidebar popover [#228969]({{kib-pull}}228969).
* Fixes an issue where some Discover **Copy to clipboard** actions only worked when accessing Kibana in a secure browser context [#229531]({{kib-pull}}229531).
* Fixes the handling of the **Body cell lines** display option in Discover when the default value is set to `-1` in Advanced Settings [#228697]({{kib-pull}}228697). 

**Elastic Observability solution**:
For the Elastic Observability 9.0.5 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.0.5 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Fixes an issue with overlapping action icons in the **Data views** menu when on mobile [#229771]({{kib-pull}}229771).
* Fixes a display issue with counter indicators on toast messages [#229300]({{kib-pull}}229300).
* Fixes an issue leading to some features not being visible when updating a space solution view to Classic [#230385]({{kib-pull}}230385).
* Decreases the loading time drastically when loading Index Management component templates [#228709]({{kib-pull}}228709).

**Machine Learning**:
* Removes `removeIfExists` from the synchronization task scheduler [#228783]({{kib-pull}}228783).


## 9.0.4 [kibana-9.0.4-release-notes]

### Features and enhancements [kibana-9.0.4-features-enhancements]

**Data ingestion and Fleet**:
* Adds a tooltip to the **Last activity** column in Agent list UI [#224850]({{kib-pull}}224850).

**Machine Learning**:
* Improves error messages in the AI Connector creation UI and ensures they're surfaced in {{kib}} [#221859]({{kib-pull}}221859).


### Fixes [kibana-9.0.4-fixes]

**Dashboards and Visualizations**:
* Fixes an issue with dashboard sharing links where copied links were not shortened and some users were unable to copy links in new spaces [#227625]({{kib-pull}}227625).
* Stops dashboards from recommending adhoc data views [#225705]({{kib-pull}}225705).
* Prevents dashboards from initiating duplicate requests when making a selection on a control [#224761]({{kib-pull}}224761).

**Data ingestion and Fleet**:
* Fixes bug that causes the CSV export to fail in Agent list [#225050]({{kib-pull}}225050).
* Replaces call to registry when deleting {{kib}} assets for custom packages [#224886]({{kib-pull}}224886).
* Fixes an issue where the background task was not deleting some unenrolled {{agents}} [#224808]({{kib-pull}}224808).
* Fixes bulk actions incorrectly selecting {{agents}} with the namespaces filter [#224036]({{kib-pull}}224036).

**Discover**:
* Makes expiration badges singular and plural [#227035]({{kib-pull}}227035).

**Elastic Observability solution**:
For the Elastic Observability 9.0.4 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.0.4 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Hides the header and side navigation when printing or exporting a dashboard with **Print layout** selected [#227095]({{kib-pull}}227095).

**Search**:
* Fixes handling of context limit errors in Playground when using the Elastic Managed LLM  [#225360]({{kib-pull}}225360).
* Adjusts `z-index` of the header menu to avoid conflicting with Console [#224708]({{kib-pull}}224708).

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
* Fixes an issue that caused errors when rules ran during an active maintenance window that had filters and a matching rule category [#221702]({{kib-pull}}221702).

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