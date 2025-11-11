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

## 9.2.0 [kibana-9.2.0-release-notes]

### Features and enhancements [kibana-9.2.0-features-enhancements]

**Navigation and general interface**:
* Enhanced navigation menu for spaces that use a solution view. The new navigation experience provides more workspace for your data with an improved collapsed mode, hover menus, and responsiveness.
* New Data Management menu. For easier access to data-related management tasks, you can now find Fleet, Index Management, Integrations, and Ingest Pipelines in a dedicated menu next to the Stack Management menu that previously hosted these pages.
* {{kib}} is now available in German in Beta. To get started, set the locale in your {{kib}} settings as follows: `i18n.locale: de-DE`. If you find any issues, please raise them on [Github](https://github.com/elastic/kibana/issues) [#236903]({{kib-pull}}236903).
* Adds a table list view mode to the space selection screen for a more scalable design when a user has access to many spaces [#229046]({{kib-pull}}229046).

**Alerting**:
* Enables incremental human-readable case IDs [#238555]({{kib-pull}}238555).
* Create case analytics indexes per solution per space [#234125]({{kib-pull}}234125).
* Shows thumbnail image of attached case file [#226004]({{kib-pull}}226004).
* Adds a new Jira Service Management connector [#235408]({{kib-pull}}235408).
* Adds `xpack.actions.email.recipient_allowlist` alert action setting, which lets you specify a list of allowed email recipient patterns (`to`, `cc`, or `bcc`) that can be used with email connectors [#220058]({{kib-pull}}220058).
* Adds support for OAuth 2.0 authentication to the Webhook connector [#218442]({{kib-pull}}218442).
* Allows you to specify additional fields for the IBM Resilient connector [#236144]({{kib-pull}}236144).
* Maintenance windows are now generally available [#233870]({{kib-pull}}233870).
* Adds support for encrypted headers in the Webhook connector [#233695]({{kib-pull}}233695).
* Automatically copies source data into the alerts-as-data documents for other {{es}} query rule types [#230010]({{kib-pull}}230010).
* You can now add filters to maintenance windows based on alert fields from all solutions, without needing to select a category first [#227888]({{kib-pull}}227888).

**Dashboards and Visualizations**:
* Adds the ability to configure index settings when importing geospatial files in Maps [#232308]({{kib-pull}}232308).
* Adds a new inline Markdown editor to edit your text without leaving the dashboard. [#229191]({{kib-pull}}229191).
* Updates the toolbar popover for Metric charts, which is now called **Appearance**, with reorganized settings into clearer sections and new Primary position, Primary alignment, Secondary alignment, and Font weight settings [#233992]({{kib-pull}}233992).
* Improves ES|QL suggestions logic when an {{esql}} visualization query changes [#231767]({{kib-pull}}231767).
* Adds a new **Add** menu to the toolbar that lets you populate your dashboard with visualizations, panels, sections, and controls. This menu replaces and combines the various buttons that previously allowed you to perform these actions [#230324]({{kib-pull}}230324).
* Improves perceived performance of dashboard flyouts [#226052]({{kib-pull}}226052).
* Adds the ability to **Select all** to Options list controls [#221010]({{kib-pull}}221010).

**Data ingestion and Fleet**:
* Adds a toggle on the {{es}} output configuration page that grants agents permission to write to the `logs` and `logs.*` data streams [#233374]({{kib-pull}}233374).
* Completes OTel configuration pipelines with an exporter [#233090]({{kib-pull}}233090).
* Enables feature to auto-install content packages when data is ingested for datasets that match the datasets defined in the packages' `discovery` fields [#232668]({{kib-pull}}232668).
* Adds the `MIGRATE` action to the `SIGNED_ACTIONS` set [#228566]({{kib-pull}}228566).
* Adds a **Show agentless resources** toggle on the Fleet > Settings page to allow for debugging and diagnostics [#237528]({{kib-pull}}237528).
* Updates the maximum supported version of package spec to 3.5 [#235942]({{kib-pull}}235942).
* Enables the installation of `alerting_rule_template` {{kib}} assets from packages; also enables a background task for reporting agent status changes in {{fleet}} [#235842]({{kib-pull}}235842).
* Adds a filter on the Integrations page to show only agentless integrations [#235686]({{kib-pull}}235686).
* Adds support for a new `url` variable type in {{fleet}} packages which provides better input validation of URLs in configurations [#231062]({{kib-pull}}231062).
* Adds support for a new `duration` variable type in {{fleet}} packages which provides better input validation of duration strings in configurations [#231027]({{kib-pull}}231027).
* Renders the accordion for sample events on the integration overview page as collapsed by default [#228799]({{kib-pull}}228799).
* Hides metrics data streams and packages on Logs Essentials projects [#227842]({{kib-pull}}227842).
* Adds a package rollback API [#226754]({{kib-pull}}226754).
* Adds support for the `keep` option in the Remove processor in ingest pipelines [#225638]({{kib-pull}}225638).
* Adds the **Add / remove tags** action on the agent details page [#225433]({{kib-pull}}225433).

**Discover**:
* You can now manage multiple data explorations simultaneously in Discover using tabs. Navigate between them seamlessly, duplicate them to build on previous queries, and save them into a single Discover session to retrieve your queries, filters, and configurations untouched at a later time [#235150]({{kib-pull}}235150).
* You can now send long-running queries to the background. When a query runs in the background, you can perform other queries and tasks, then open it later from a new Background searches flyout to view cached results. This feature is in technical preview and disabled by default in this release. Check [this page](docs-content://explore-analyze/discover/background-search.md) for instructions [#236818]({{kib-pull}}236818).
* Improves Discover’s {{esql}} LOOKUP JOIN experience with an index editor flyout supporting inline editing, and CSV import [#232686]({{kib-pull}}232686).
* You can now add variable controls to your {{esql}} queries in Discover just like for your {{esql}} visualizations in Dashboards [#229598]({{kib-pull}}229598).
* Adds related errors count and failure badge when exploring traces in Discover [#227413]({{kib-pull}}227413).
* Shows logs related to the current document when exploring traces in Discover [#232784]({{kib-pull}}232784).
* Adds a warning when navigating away from Discover with unsaved changes [#225252]({{kib-pull}}225252).
* Adds the ability to view the currently active profiles, such as the detected solution and data source contexts, which determine Discover's context-aware experiences [#222999]({{kib-pull}}222999).
* Appends the casting only when necessary in Discover's {{esql}} mode filtering [#234748]({{kib-pull}}234748).
* Removes the default limit of `10` added to the query base query when switching to {{esql}} mode in Discover [#234349]({{kib-pull}}234349).

**{{esql}} editor**:
* Extends the {{esql}} query history size to 50 KB, which represents between 200 to 300 queries instead of 20 [#232955]({{kib-pull}}232955).
* Adds support for lookup indices from remote clusters [#232907]({{kib-pull}}232907).
* The {{esql}} autocomplete feature has been extended so that fields from the selected lookup index are suggested when using the `LOOKUP JOIN` command. The same enhancement was applied to column suggestions when using the `ENRICH` command [#233221]({{kib-pull}}233221).
* Improves function validation [#230139]({{kib-pull}}230139).
* Adds support for expressions in the STATS command [#229513]({{kib-pull}}229513).
* Enhances GROK semantics extraction with Onigurama regex patterns [#229409]({{kib-pull}}229409).
* Adds a **Prettify** button that formats queries to make them more readable [#228159]({{kib-pull}}228159).
* Displays function license requirements in the in-product {{esql}} help reference [#229961]({{kib-pull}}229961).

**Elastic Observability solution**:
For the Elastic Observability 9.2.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.2.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Machine Learning**:
* Sets the default retention period for results from the logs anomaly detection configurations to 120 days [#231080]({{kib-pull}}231080).
* Redesigns the file upload UX and adds the ability to upload multiple files and existing indices [#232923]({{kib-pull}}232923).
* Adds a **GenAI Settings** page to **Stack Management** that lets you manage AI feature access for your deployment [#227289]({{kib-pull}}227289), [#233727]({{kib-pull}}233727).
* Introduces a new connector in technical preview, the AI Connector, which provides a single interface for connecting to a range of large language model providers [#235166]({{kib-pull}}235166), [#236951]({{kib-pull}}236951), [#228116]({{kib-pull}}228116).
* Inference endpoints UI: Adds tech preview for e5 preconfig endpoint [#234811]({{kib-pull}}234811).
* Inference endpoints UI: Adds tech preview for rerank preconfig endpoint [#235222]({{kib-pull}}235222).
* Improves the layout for custom URLs list in the data frame analytics form [#232575]({{kib-pull}}232575).
* AI Connector/Inference endpoints creation UI: Adds icon for AI21 labs and Llama Stack [#232098]({{kib-pull}}232098).
* Ensures ELSER and E5 product docs are appropriately updated when Kibana is upgraded [#231884]({{kib-pull}}231884).
* Improves layout for custom URLs when creating a {{ml}} job [#231751]({{kib-pull}}231751).
* Adds a check to validate whether your newly uploaded index is searchable [#231614]({{kib-pull}}231614).
* Displays document count chart for ES|QL categorize queries [#231459]({{kib-pull}}231459).
* UX enhancements for editing fields in the AI Connector flyout [#231037]({{kib-pull}}231037).

**Kibana platform and management**:
* Data views managed by Elastic are now clearly identified in the UI. You can no longer edit them and instead have to duplicate them to apply any changes while preserving the original data view [#223451]({{kib-pull}}223451).
* Adds an option to convert an index to a lookup index [#233998]({{kib-pull}}233998).
* The Console introduction tour is now disabled by default. You can manually start the tour at any time from the Help popover [#227978]({{kib-pull}}227978).
* Improves the rate-limiter UX [#227678]({{kib-pull}}227678).

**Elasticsearch solution**:
* [Agent Builder](docs-content://solutions/search/elastic-agent-builder.md) is now available in technical preview. Build custom agents and tools to explore your Elastic data using natural language, in real time or programmatically using MCP, A2A, or REST APIs. You must [enable the feature](docs-content://solutions/search/agent-builder/get-started.md#enable-agent-builder) to get started.
* Adds the ability to save Playgrounds within a space [#229511]({{kib-pull}}229511).
* Improves code examples in the Synonyms interface [#235944]({{kib-pull}}235944).


### Fixes [kibana-9.2.0-fixes]

**Alerting**:
* Fetches the tracked alerts without depending on the task state [#235253]({{kib-pull}}235253).
* Fixes a bug that prevented the query field from properly loading in the rule request if you used a saved query [#229964]({{kib-pull}}229964).

**Dashboards and Visualizations**:
* Null buckets and empty string values are now rendered in the UI as `(missing value)` and `(empty)` respectively. This is now aligned across charts and tables, including Discover and Lens charts [#233369]({{kib-pull}}233369).
* Skips automatic scroll when interacting with a panel that is already visible [#233226]({{kib-pull}}233226).
* Shows solid panel borders when a dashboard is in **View** mode [#232676]({{kib-pull}}232676).
* Fixes error handling when saving a Links panel to the library from a dashboard [#231168]({{kib-pull}}231168).
* Logs a warning instead of throwing an error if a filter and query state can not be read or written due to missing or malformed references [#230088]({{kib-pull}}230088).

**Data ingestion and Fleet**:
* Fixes "package not found" error when skipping cloud onboarding for a prerelease package [#238629]({{kib-pull}}238629).

**Discover**:
* Fixes an issue with the data view creation flyout that could glitch when accessed from a separate page [#228749]({{kib-pull}}228749).

**{{esql}} editor**:
* Fixes controls' trigger across various commands [#236121]({{kib-pull}}236121).
* Fixes lookup index route failures on read permissions [#233282]({{kib-pull}}233282).
* Fixes an issue on Firefox where the {{esql}} inline editor could prevent scrolling [#228849]({{kib-pull}}228849).

**Elastic Observability solution**:
For the Elastic Observability 9.2.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.2.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Machine Learning**:
* Adds unique accessible labels for the **Show top field values** buttons on the **Log Rate Analysis** page [#237972]({{kib-pull}}237972).
* Single Metric Viewer: fixes partition field settings errors in the dashboard panel [#237046]({{kib-pull}}237046).
* Escapes URL-like string from being displayed as links in email clients [#226849]({{kib-pull}}226849).

**Search**:
* Fixes an accessibility issue where resetting changes or removing all terms in the Synonyms panel was not announced by screen readers. VoiceOver users on Safari will now hear updates when terms are reset [#237877]({{kib-pull}}237877).
* Fixes an issue with a null property being read in Playground [#230729]({{kib-pull}}230729).


## 9.1.7 [kibana-9.1.7-release-notes]

% ::::{NOTE}
% ::::


### Features and enhancements [kibana-9.1.7-features-enhancements]

**Machine Learning**:
* Adds a feedback button to Anomaly Explorer and Single Metric Viewer [#239883]({{kib-pull}}239883).


### Fixes [kibana-9.1.7-fixes]

**Alerting**:
* In Cases, tables no longer flash when the page is loading [#240155]({{kib-pull}}240155).
* Fixes an infinite loop issue occurring when the Investigation guide of a rule's details is too long [#240472]({{kib-pull}}240472).

**Dashboards and visualizations**:
* Labels in Maps' **Create index** flow now render with the default **Use vector tiles** scaling as soon as label styling is applied (or after saving), without requiring a scaling toggle [#240728]({{kib-pull}}240728).
* Fixes an issue occurring when resetting a dashboard with unsaved changes after enabling `timeRestore` and setting a time range [#239992]({{kib-pull}}239992).

**Data ingestion and Fleet**:
* Shows warnings in the integrations synchronization UI when referencing other entities [#241623]({{kib-pull}}241623).
* Adds proxy SSL options to download sources [#241115]({{kib-pull}}241115).
* Fixes Fleet policy name uniqueness not being consistently enforced across spaces when name or space changes occur [#239631]({{kib-pull}}239631).

**{{product.kibana}} platform**:
* Ensures that the `max_tokens` parameter is correctly passed as expected when connecting to Anthropic [#241212]({{kib-pull}}241212) & [#241188]({{kib-pull}}241188).
* Removes the default fallback region for the Amazon Bedrock connector [#241157]({{kib-pull}}241157).

**{{product.observability}} solution**:
For the {{product.observability}} 9.1.7 release information, refer to [{{product.observability}} Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**{{product.security}} solution**:
For the {{product.security}} 9.1.7 release information, refer to [{{product.security}} Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Machine Learning**:
* Ensures that the inference endpoints list loads properly even when using a custom inference provider [#240189]({{kib-pull}}240189).

## 9.1.6 [kibana-9.1.6-release-notes]

% ::::{NOTE}
% ::::


### Features and enhancements [kibana-9.1.6-features-enhancements]

**Data ingestion and Fleet**:
* Replaces the `?showAgentless` query param with a local storage setting called `fleet:showAgentlessResources`, which can be toggled from the {{fleet}} settings page. When enabled, agentless agents and policies are visible in the {{fleet}} UI [#237528]({{kib-pull}}237528).

**Elastic Security solution**:
For the Elastic Security 9.1.6 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana security**:
* Enhances error message by explaining why the role is considered malformed [#239098]({{kib-pull}}239098).


### Fixes [kibana-9.1.6-fixes]

**Dashboards and Visualizations**:
* Fixes bug that prevented you from deleting unsaved dashboard changes after you had enabled the `timeRestore` setting and selected a time and date using the date picker [#239992]({{kib-pull}}239992).
* Fixes error that occured when you selected a blank value in the options list [#239791]({{kib-pull}}239791).
* Fixes a bug in Lens that incorrectly assigned unsaved, ad-hoc dataview references [#239431]({{kib-pull}}239431).
* Fixes metric color assignment when breakdown and a max dimension are defined in Lens [#238901]({{kib-pull}}238901).
* Ensures adhoc dataviews from {{esql}} charts aren't being filtered out in the KQL search bar [#238731]({{kib-pull}}238731).

**Data ingestion and Fleet**:
* Fixes bug that occured during an integration policy upgrade that prevented the new package global variables from being included and stale variable references from being removed [#238542]({{kib-pull}}238542).

**Discover**:
* Ensures that the combined filters are considered when selecting the correct fields for the query while the `courier:ignoreFilterIfFieldNotInIndex` advanced setting is enabled [#238945]({{kib-pull}}238945).

**Elastic Observability solution**:
For the Elastic Observability 9.1.6 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.6 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Search**:
* Fixes visual issues with the document metadata popup that happened when the document ID was too long. Also adds a tooltip and copy button to improve the user experience [#239768]({{kib-pull}}239768).

## 9.1.5 [kibana-9.1.5-release-notes]

% ::::{NOTE}
% ::::


### Features and enhancements [kibana-9.1.5-features-enhancements]

**Data ingestion and Fleet**:
* Renames Fleet Server SSL options for clarity in the **Add a Fleet Server** flyout [#236887]({{kib-pull}}236887).

**Elastic Security solution**:
For the Elastic Security 9.1.5 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

### Fixes [kibana-9.1.5-fixes]

**Alerting**:
* Rolls over the reporting data stream if its template version is newer than the version in the data stream's mappings [#234119]({{kib-pull}}234119).

**Dashboards and Visualizations**:
* Fixes an issue where the dashboard title would not get updated in the breadcrumb when edited from the list of dashboards [#236561]({{kib-pull}}236561).
* Updates dashboards to wait until controls are ready before rendering panels to prevent a double fetch of data [#237169]({{kib-pull}}237169).
* Fixes an issue with the Lens table's column sort order being different in the dashboard and the exported CSV [#236673]({{kib-pull}}236673).

**Data ingestion and Fleet**:
* Fixes text kerning issues in PDF/PNG exports of dashboards and visualizations [#235516]({{kib-pull}}235516).
* Fixes incorrect copying of SSL settings to the Fleet Hosts section of generated Agent policies [#236788]({{kib-pull}}236788).
* Validates the Logstash pipeline ID at the {{kib}} API level [#236347]({{kib-pull}}236347).
* Adds a unique count to improve accuracy of the number of transforms on the integrations overview page [#236177]({{kib-pull}}236177).
* Fixes malformed synthetics package policies [#236176]({{kib-pull}}236176).

**Discover**:
* Clears sort by `timestamp` when navigating from classic to ES|QL mode [#235338]({{kib-pull}}235338).
* Fixes sizing issues with the **Actions** column header [#235227]({{kib-pull}}235227).

**Kibana security**:
* Allows `xpack.spaces.defaultSolution` to be configured through environment variables for Docker deployments [#236570]({{kib-pull}}236570).

**Machine Learning**:
* Omits fields that should not be included in datafeed preview requests when testing custom URLs in anomaly detection jobs [#234709]({{kib-pull}}234709).
* Improves trained model performance by adding filters to the request to fetch all index settings [#237072]({{kib-pull}}237072).
* Hides the show forecast checkbox when selecting a new job in the Single Metric Viewer [#236724]({{kib-pull}}236724).
* Makes alerts visible in Anomaly Explorer to all Machine Learning-only users regardless of where they create rules [#236289]({{kib-pull}}236289).
* Fixes the **Job details** flyout on the **Analytics Map** page [#236131]({{kib-pull}}236131).
* Fixes rendering of the dashboard panel in PDF reporting for the Anomaly Swim Lane [#235475]({{kib-pull}}235475).
* Limits log rate analysis category requests to reduce `msearch` usage [#235611]({{kib-pull}}235611).

**Management**:
* Adds the `managed` field to the data views response schema to prevent the public API call from failing [#236237]({{kib-pull}}236237).
* Adds the `timeFieldName` field to the data views response schema to prevent the public API call from failing [#235975]({{kib-pull}}235975).
* Fixes privilege requirements when reindexing indices through Upgrade Assistant. Previously, the `superuser` role was required, but now the `cluster: manage` and `all` privileges are sufficient [#237055]({{kib-pull}}237055).

**Stack Management**:
* Adds the ability to do partial matches and searches in the **API keys** section [#221959]({{kib-pull}}221959).

**Search solution**:
* Adds search functionality to the **Query rules** details page [#232579]({{kib-pull}}232579).

## 9.1.4 [kibana-9.1.4-release-notes]

% ::::{NOTE}
% ::::


### Features and enhancements [kibana-9.1.4-features-enhancements]

**Elastic Observability solution**:
For the Elastic Observability 9.1.4 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Stack management**
* Adds IPv6 support to remote clusters address fields [#233415]({{kib-pull}}233415).


### Fixes [kibana-9.1.4-fixes]

**Dashboards and Visualizations**:
* Fixes an issue with the Save modal that allowed duplicate saves of dashboards, visualizations, and other objects when clicking the **Save** button multiple times [#233933]({{kib-pull}}233933).

**Elastic Security solution**:
For the Elastic Security 9.1.4 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Machine Learning**:
* The **Run** button is now properly disabled in Elastic Managed LLM tests when the action's JSON body isn't valid [#231873]({{kib-pull}}231873).

## 9.1.3 [kibana-9.1.3-release-notes]

:::{important}
The 9.1.3 release contains fixes for potential security vulnerabilities. Check our [security advisory](https://discuss.elastic.co/c/announcements/security-announcements/31) for more details.
:::

### Fixes [kibana-9.1.3-fixes]

**Alerting**:
* Fixes an issue that prevents reports from showing in the Reporting UI when they're created in a non-default {{kib}} space with a dash in its name [#230876]({{kib-pull}}230876).

**Dashboards and Visualizations**:
* Fixes an issue in Lens that caused color mapping changes to render as gray [#231563]({{kib-pull}}231563).
* Fixes broken references that occured when you returned to an unsaved dashboard with reference panels [#231517]({{kib-pull}}231517).

**Data ingestion and Fleet**:
* Fixes the `deployment_modes` evaluation for policy templates when creating a package policy. When deploying in agentless mode, this prevents the acceptance of inputs from policy templates that are not opted into the agentless mode at the template level [#231679]({{kib-pull}}231679).

**Discover**:
* Disables sorting for JSON-like fields in ES|QL mode [#231289]({{kib-pull}}231289).

**Elastic Observability solution**:
For the Elastic Observability 9.1.3 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.3 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Fixes a bug where the schedule interval of the cleanup task for unused URLs wouldn't update if the `share.url_expiration.duration` changed [#231883]({{kib-pull}}231883).
* Updates the built-in `reporting_user` role to leverage a new  `reporting_user` reserved privilege [#231533]({{kib-pull}}231533).

## 9.1.2 [kibana-9.1.2-release-notes]


### Fixes [kibana-9.1.2-fixes]

**Alerting**:
* Fixes an issue that prevents reports from showing in the Reporting UI when they're created in a non-default {{kib}} space with a dash in its name [#230876]({{kib-pull}}230876).

**Data ingestion and Fleet**:
* Fixes validation for `text` and `password` inputs in the package policy editor [#229932]({{kib-pull}}229932).

**Elastic Observability solution**:
For the Elastic Observability 9.1.2 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.2 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Fixes the breadcrumb to include a link to the home page when browsing pages from the **Elasticsearch** section of the navigation [#230270]({{kib-pull}}230270).

## 9.1.1 [kibana-9.1.1-release-notes]

% ::::{NOTE}
% ::::


### Features and enhancements [kibana-9.1.1-features-enhancements]

**Dashboards and Visualizations**:
* Improves usability of dashboards when zooming up to 400% [#228978]({{kib-pull}}228978).
* Adds list options to ES|QL controls in dashboards [#227334]({{kib-pull}}227334).

**Management**:
* Console now uses explicit host selection instead of retrying failed hosts, ensuring predictable behavior and preventing silent request failures. This change fixes an issue in Console where request bodies were lost during automatic host retries. [#229574]({{kib-pull}}229574).


### Fixes [kibana-9.1.1-fixes]

**Dashboards and Visualizations**:
* Fixes incorrect panel rendering when the **Defer loading panels below "the fold"** advanced setting is on [#229662]({{kib-pull}}229662).
* Fixes an issue in reports where a PNG or PDF export would offset and clip part of the visualization in *Lens* [#228603]({{kib-pull}}228603).
* Fixes {{esql}} loading button state for long running queries in *Lens* [#226565]({{kib-pull}}226565).
* Improves the layout and accessibility of the {{esql}} control editor [#228103]({{kib-pull}}228103).

**Data ingestion and Fleet**:
* Fixes an issue where the SSL configuration isn't properly added to agent policies with pre-configured output types [#230211]({{kib-pull}}230211).

**Discover**:
* Fixes an issue where HTML search highlighting markup is incorrectly carried over into filter values when using the **Filter for value** field action in the **Log overview** tab [#227652]({{kib-pull}}227652).


**Elastic Observability solution**:
For the Elastic Observability 9.1.1 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.1 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Machine Learning**:
* Fixes patterns field selector menu width [#228791]({{kib-pull}}228791).

**Kibana platform**:
* Fixes the breadcrumb to include a link to the home page when browsing pages from the **Elasticsearch** section of the navigation [#230270]({{kib-pull}}230270).


## 9.1.0 [kibana-9.1.0-release-notes]

If you're upgrading to version 9.1.0, you first need to upgrade to version [8.19](https://www.elastic.co/guide/en/kibana/8.19/release-notes-8.19.0.html) or [9.0](#kibana-900-release-notes).

### Features and enhancements [kibana-9.1.0-features-enhancements]

**Alerting**:
* Adds the ability to schedule reports on a recurring basis and view previously scheduled reports [#224849]({{kib-pull}}224849), [#221028]({{kib-pull}}221028).
* Adds the `xpack.actions.email.services.enabled` {{kib}} setting, which allows you to enable or disable email services for email connectors [#223363]({{kib-pull}}223363).
* Adds the `xpack.actions.webhook.ssl.pfx.enabled` {{kib}} setting, which allows you to disable Webhook connector PFX file support for SSL client authentication [#222507]({{kib-pull}}222507).
* Adds the `xpack.actions.email.services.ses.host` {{kib}} setting, which lets you specify the SMTP endpoint for an Amazon Simple Email Service (SES) service provider that can be used by email connectors. Also adds the `xpack.actions.email.services.ses.hostport` {{kib}} setting, which allows you to specify the port number for an Amazon SES service provider that can be used by email connectors [#221389]({{kib-pull}}221389). 
* Adds `rrule` notation support for task scheduling [#217728]({{kib-pull}}217728).
* Publishes new public APIs for the Maintenance Window [#216756]({{kib-pull}}216756).
* Allows you to delete Maintenance Windows [#211399]({{kib-pull}}211399).
* Adds an alert cleanup functionality that allows you to delete active or inactive (acknowledged, recovered, closed, or untracked) alerts with no status update for a period of time [#216613]({{kib-pull}}216613).
* Adds an embeddable panel for dashboards that allows you to show a simplified version of the Alerts table from {{observability}} or {{elastic-sec}} [#216076]({{kib-pull}}216076).
* Ensures the **Reporting** page only shows reports generated in the current space [#221375]({{kib-pull}}221375).
* Moves the rule settings to a flyout [#216162]({{kib-pull}}216162).
* Allows users to delete a snooze schedule from a rule using schedule ID [#213247]({{kib-pull}}213247).
* Allows users to create a snooze schedule for rules using the schedule API [#210584]({{kib-pull}}210584).
* Implements functionality to add observables, procedures, and custom fields to alerts for {{hive}} [#207255]({{kib-pull}}207255).

**Dashboards and Visualizations**:
* Adds the **Create alert rule** action to ES|QL dashboard panels, usable from the panel context menu or by right-clicking a data point on the visualization. This rule allows you to generate an alert when the data on the chart crosses a certain threshold [#217719]({{kib-pull}}217719).
* Adds collapsible sections to dashboards that allow you to group panels into logical groups. Collapsible sections also help dashboards load faster by only loading their content when expanded [#220877]({{kib-pull}}220877).
* Adds the ability to mark a dashboard as favorite from within the dashboard in addition to the **Dashboards** page [#201596]({{kib-pull}}201596).
* Adds the ability to resize and move dashboard panels using a keyboard [#208286]({{kib-pull}}208286).
* Adds a highlight effect when adding a panel to a dashboard [#223614]({{kib-pull}}223614).
* Adds the ability to create {{esql}} controls from the dashboard **Controls** menu [#219495]({{kib-pull}}219495).
* Adds the ability to create {{esql}} controls by typing a question mark (`?`) when editing an {{esql}} visualization's query [#216839]({{kib-pull}}216839).
* Allows the creation of dynamic aggregations controls for {{esql}} visualizations [#210170]({{kib-pull}}210170).
* Improves handling of `?_tstart` and `?_tend` named parameters when the {{esql}} visualization's query includes controls [#225054]({{kib-pull}}225054).
* Adds CRUD API routes for Lens [#223296]({{kib-pull}}223296).
* The **Color Mapping** feature is now GA. Previous Lens palette definitions are deprecated and will continue to function normally with no visual change to existing visualizations. Toggling off legacy mode will replace the palette with an equivalent color mapping configuration [#220296]({{kib-pull}}220296).
* Adds **Compare to** badge for Metric charts in Lens [#214811]({{kib-pull}}214811).
* Updates time-based charts to use the multi-layer time axis by default, providing a better time window context and improved label positioning [#210579]({{kib-pull}}210579).
* Enables read-only editor mode to inspect a panel's configuration in Lens [#208554]({{kib-pull}}208554).
* Adds a **Point visibility** option to Area and Line charts in Lens [#222187]({{kib-pull}}222187).
* Adds a setting to control the data table density in Lens [#220252]({{kib-pull}}220252).
* Opens Lens in the same tab when you select **Open in Lens** on a visualization [#217528]({{kib-pull}}217528).
* Adds the ability to open links from Vega visualizations in a new tab by specifying the `"target": "_blank"` option for the `usermeta.embedOptions.loader` property of the Vega chart configuration [#216200]({{kib-pull}}216200).
* Adds globe projection improvements to Maps [#212437]({{kib-pull}}212437).
* When possible, keeps the chart configuration after editing an {{esql}} visualization's query [#210780]({{kib-pull}}210780).

**Data ingestion and Fleet**:
* Adds support for bulk agent migration using the **Bulk actions** menu in the agent list table [#224334]({{kib-pull}}224334).
* Enables the tabular integrations feature in {{fleet}} [#222842]({{kib-pull}}222842).
* Adds support for single agent migration using the **Actions** menu in {{fleet}}. Users can provide a remote cluster URL and enrollment token, as well as customize parameters for the migration [#222111]({{kib-pull}}222111).
* Adds an API endpoint to migrate a single agent to another cluster using a URL and enrollment token. Tamper-protected and {{fleet}}-managed agents are not supported and return a `403` response if attempted [#220601]({{kib-pull}}220601).
* Adds a new integration flyout component [#220229]({{kib-pull}}220229).
* Enables the sync integrations on remote clusters feature in Fleet [#220215]({{kib-pull}}220215).
* Enables the automatic agent upgrades feature in Fleet [#219932]({{kib-pull}}219932).
* Adds edit functionality for custom integration READMEs. Editing a README automatically increments the integration version and updates all associated policies [#215259]({{kib-pull}}215259).
* Adds SSL fields to agent binary source settings [#213211]({{kib-pull}}213211).
* Adds support for Cloud Connectors in CSPM [#212200]({{kib-pull}}212200).
* Exposes SSL options for {{es}} and remote {{es}} outputs in the UI [#208745]({{kib-pull}}208745).
* Adds SSL options to {{fleet}} Server host settings [#208091]({{kib-pull}}208091).
* Adds a new action to add tags from the **Agent details** page [#225433]({{kib-pull}}225433).
* Adds a tooltip to the **Last activity** column in the agent list UI [#224850]({{kib-pull}}224850).
* Adds support for agentless traffic filters [#222082]({{kib-pull}}222082).
* Makes the tag filter in {{fleet}} agents searchable and sorted [#219639]({{kib-pull}}219639).
* Adds a callout to highlight breaking changes during integration upgrades [#217257]({{kib-pull}}217257).
* Adds MSI installer command support for {{fleet}} Server and agents [#217217]({{kib-pull}}217217).
* Makes SSL optional for {{fleet}} Logstash outputs [#216216]({{kib-pull}}216216).
* Formats the **Last activity** value in the {{fleet}} agent details view as a datetime [#215531]({{kib-pull}}215531).
* Adds support for `searchAfter` and point-in-time (`pit`) parameters in the get agents list API [#213486]({{kib-pull}}213486).
* Registers a custom integrations search provider [#213013]({{kib-pull}}213013).
* Adds support for collapsible sections in integration overview pages [#223916]({{kib-pull}}223916).

**Discover**:
* Adds an **Attributes** tab to the document viewer when exploring OTel documents in the Observability solution view [#222391]({{kib-pull}}222391).
* Shows any available results when an ES|QL query times out as a result of the `search:timeout` advanced setting [#219027]({{kib-pull}}219027).
* Adds click actions for Stacktrace and Degraded Fields when exploring logs in Discover [#214413]({{kib-pull}}214413).
* Shows a **Load more** option instead of pagination when exploring Logs in Discover [#211176]({{kib-pull}}211176).
* Expands the {{esql}} editor to fit the query size automatically when loading Discover [#225509]({{kib-pull}}225509).
* Hides the **Selected only** toggle in pages that don't support filtering by value [#220624]({{kib-pull}}220624).
* Adds a **Copy value** button to field value cells in the Document viewer [#218817]({{kib-pull}}218817).
* Adds a warning and a tooltip for explaining the `_score` column in Discover [#211013]({{kib-pull}}211013).
* Adds support for `command`/`ctrl` + click to open new Discover sessions in a separate tab. This is useful, for example, when conducting multiple searches simultaneously [#210982]({{kib-pull}}210982).
* Improves the **Display options** menu layout [#210180]({{kib-pull}}210180).
* Updates styles for Color formatter to look like badges [#189391]({{kib-pull}}189391).

**{{esql}} editor**:
* The {{esql}} `LOOKUP_JOIN` command is now GA [#225117]({{kib-pull}}225117).
* The {{esql}} `COMPLETION` command is now available in technical preview [#224811]({{kib-pull}}224811).
* The {{esql}} `FORK` command is now available in technical preview [#224680]({{kib-pull}}224680).
* Adds suggestions for all operators when writing queries [#223503]({{kib-pull}}223503).
* Improves handling of long fields [#223222]({{kib-pull}}223222).
* Adds support for `date_nanos` fields in `BUCKET` functions [#213319]({{kib-pull}}213319).
* Shows list of keyboard shortcuts at the bottom of the editor [#221331]({{kib-pull}}221331).
* Adds suggestions for full text search when writing queries [#221239]({{kib-pull}}221239).
* Adds full text search suggestions to `STATS ... WHERE` queries [#220691]({{kib-pull}}220691).
* Adds autocomplete suggestions for `STATS...WHERE` [#216379]({{kib-pull}}216379).
* Enables suggestions for the `CHANGE_POINT` command [#218100]({{kib-pull}}218100).
* Adds validation and autocomplete support for the `CHANGE_POINT` command [#216043]({{kib-pull}}216043).
* Highlights code examples in the in-product documentation [#214915]({{kib-pull}}214915).
* Suggests triple quotes when using `KQL` and `QSTR` functions [#211457]({{kib-pull}}211457).

**Elastic Observability solution**:
For the Elastic Observability 9.1.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Adds an option to User Settings that allows displaying the Kibana interface in high contrast mode [#216242]({{kib-pull}}216242).
* Adds an unused URL saved objects cleanup task to reduce upgrade downtime [#220138]({{kib-pull}}220138).
* Adds a `defaultSolution` setting to spaces configuration so that you can start Kibana with its default space set to a specific solution view [#218360]({{kib-pull}}218360).
* Kibana logging's pattern layout, used by default for the console appender, will now use a new default pattern layout: `[%date][%level][%logger] %message %error`. This includes the error name and stack trace if these were included in the log entry. To opt out of this behavior, you can omit the `%error` placeholder from your log pattern configuration in `kibana.yml` [#219940]({{kib-pull}}219940). For example: 

```yml
logging:
  appenders:
    console:
      type: console
      layout:
        type: pattern
        pattern: "[%date][%level][%logger] %message"
```

**Machine Learning**:
* Moves job and trained model management features into Stack Management [#204290]({{kib-pull}}204290).
* Updates NL-2-ESQL docs [#224868]({{kib-pull}}224868).
* Hides the **Adaptive Allocations** toggle in Serverless [#224097]({{kib-pull}}224097).
* Adds rare scripts job to preconfigured Security:Windows anomaly detection jobs [#223041]({{kib-pull}}223041).
* Adds new subAction for converse and converseStream for Bedrock [#223033]({{kib-pull}}223033).
* Adds a recommended query for the `CATEGORIZE` function in {{esql}} [#222871]({{kib-pull}}222871).
* Adds the ability to disable the AIOps features in {{kib}} [#221286]({{kib-pull}}221286).
* Adds new severity colors and UX for filtering anomalies [#221081]({{kib-pull}}221081).
* Prevents the download of models already present in other spaces and shows a warning [#220238]({{kib-pull}}220238).
* Enhances `No Results` state for Change Point Detection [#219072]({{kib-pull}}219072).
* Fixes some OpenAI models not accepting temperature for Inference service [#218887]({{kib-pull}}218887).
* Adds Voyage AI and DeepSeek icons [#216651]({{kib-pull}}216651).
* Enhances the display for anomaly time function values in anomaly tables [#216142]({{kib-pull}}216142).
* Improves the UX for deploying trained models [#205699]({{kib-pull}}205699).

**Management**:
* Adds autocomplete suggestions for {{esql}} queries in Console [#219980]({{kib-pull}}219980).
* Adds a loader indicator when datasources are being loaded [#225005]({{kib-pull}}225005).


**Search solution**:
* Adds a section that enables adding, updating, and deleting query rules written on top of the Query Rules APIs to pin or exclude documents according to criteria you set. [#227226]({{kib-pull}}227226).
* Adds a **Home** page dedicated to the Elasticsearch solution to Classic and Elasticsearch solution views [#225162]({{kib-pull}}225162).
* Updates the navigation items available for the Elasticsearch solution view and the Elasticsearch section of the Classic view [#224755]({{kib-pull}}224755).

**Sharing**:
* Adds the ability to switch between relative and absolute time range when sharing objects [#218056]({{kib-pull}}218056).

### Fixes [kibana-9.1.0-fixes]

**Alerting**:
* Fixes a regression that caused the cases actions to disappear from the Alerts table **Bulk actions** menu [#215111]({{kib-pull}}215111).

**Dashboards and Visualizations**:
* Forwards the secondary prefix correctly when the state value is an empty string (`None` option) in Lens [#228183]({{kib-pull}}228183).
* Fixes an issue where a Lens Partition chart (i.e. `Pie`) prevented the user from selecting a legacy palette [#228051]({{kib-pull}}228051).
* Fixes an accessibility issue where dashboard controls should be grouped as a labelled list [#227633]({{kib-pull}}227633).
* Fixes incorrectly disabled range slider tooltip and moves the **Delete control** button to be more visible [#227295]({{kib-pull}}227295).
* Fixes secondary metric styles to prevent wrapping in Lens [#227234]({{kib-pull}}227234).
* Keeps the **Save** button enabled in case of save error [#227091]({{kib-pull}}227091).
* Hides the **Select All** checkbox from single select controls [#226311]({{kib-pull}}226311).
* Removes `kebab-case` warnings [#226114]({{kib-pull}}226114).
* Fixes an issue with dashboards not saving due to exceptionally high number of references in the request payload [#225908]({{kib-pull}}225908).
* Prevents dashboards from recommending adhoc data views [#225705]({{kib-pull}}225705).
* Prevents Lens Embeddable `defaultTitle` from being overwritten with a custom title after reload [#225664]({{kib-pull}}225664).
* Fixes panel title synchronization with the corresponding saved object when using `defaultTitle` [#225237]({{kib-pull}}225237).
* Fixes visual issues causing labels to be truncated [#225430]({{kib-pull}}225430).
* Refreshes **Values from a query** options for {{esql}} controls on dashboard reload [#225101]({{kib-pull}}225101).
* Fixes an issue with calculating the query for retrieving {{esql}} control values [#214905]({{kib-pull}}214905).
* Fixes an issue with the {{esql}} **Create control** suggestions not triggering if the query already contained a control [#214833]({{kib-pull}}214833).
* Fixes the visibility of the date picker when writing {{esql}} visualization queries [#214728]({{kib-pull}}214728).
* Fixes a performance issue with {{esql}} visualizations in case of errors in the query [#225067]({{kib-pull}}225067).
* Fixes dashboard control value changes causing multiple fetches [#224761]({{kib-pull}}224761).
* Fixes an issue in Lens where reordering the groups within a layer would incorrectly assign the color mapping to a group other than the first [#215426]({{kib-pull}}215426).
* Fixes invalid dashboard being displayed as 404 instead of showing a validation error [#211661]({{kib-pull}}211661).
* Fixes an issue where custom ranges and multi-field values were not correctly colored based on selected color mapping configurations [#207957]({{kib-pull}}207957).

**Data ingestion and Fleet**:
* Fixes CSV export in the agent list [#225050]({{kib-pull}}225050).
* Replaces registry call when deleting {{kib}} assets for custom packages [#224886]({{kib-pull}}224886).
* Ensures package policy names are unique when moving across spaces [#224804]({{kib-pull}}224804).
* Fixes bulk actions incorrectly selecting agents when a namespace filter is applied [#224036]({{kib-pull}}224036).
* Reverts "Added instructions for installing {{agent}} complete." [#223520]({{kib-pull}}223520).
* Fixes styled component theme lookup issue [#221979]({{kib-pull}}221979).
* Fixes SSL config being overridden by advanced YAML in full agent policy [#219902]({{kib-pull}}219902).
* Fixes required capability for the SIEM migrations topic [#219427]({{kib-pull}}219427).
* Makes output and {{fleet}} Server settings non-editable for agentless policies [#218905]({{kib-pull}}218905).
* Supports integrations with secrets that contain multiple values [#216918]({{kib-pull}}216918).
* Adds remote cluster instructions for syncing integrations [#211997]({{kib-pull}}211997).
* Updates install snippets to include all platforms [#210249]({{kib-pull}}210249).

**Discover**:
* Fixes an issue where an {{esql}} query was overwritten when edited while the previous request was still running [#224671]({{kib-pull}}224671).
* Fixes invalid input highlight in the **Data View** flyout [#226822]({{kib-pull}}226822).
* Fixes an issue causing Discover to freeze when dragging and dropping columns with animations disabled [#226592]({{kib-pull}}226592).
* Fixes row highlighting when reordering columns [#226584]({{kib-pull}}226584).
* Fixes error appearing when updating and then deleting a saved query [#226569]({{kib-pull}}226569).
* Fixes a cell value alignment issue for aggregate metric fields [#226562]({{kib-pull}}226562).
* Adds missing information icon to the document viewer table [#222299]({{kib-pull}}222299).
* Fixes an issue incorrectly showing the unmapped icon when a field changed from unmapped to mapped [#221308]({{kib-pull}}221308).
* Fixes the parsing of index patterns in Kibana's **Inspect** feature. Previously, certain index pattern strings were not being parsed and displayed correctly [#221084]({{kib-pull}}221084).
* Fixes an issue that causes redirects from the deprecated **Logs Stream** and **Logs Explorer** routes to Discover to lose some context such as the selected time range or KQL query [#215867]({{kib-pull}}215867).
* Excludes only {{es}} metadata fields from the Summary column instead of all fields starting with `_` [#213255]({{kib-pull}}213255).
* Fixes inability to clear the **Document ID** in data view field editor preview [#220891]({{kib-pull}}220891).
* Fixed multiple accessibility issues, including adding missing aria labels and column headers, improving keyboard navigation and interactions, and improving focus changes when interacting with Discover features [View list of fixes](https://github.com/elastic/kibana/issues?q=state:closed%20label:Project:Accessibility%20label:v9.1.0%20label:Team:DataDiscovery).

**{{esql}} editor**:
* Fixes wrong validation on expressions between aggregations [#227989]({{kib-pull}}227989).
* Hides lookup index hidden indices from autocomplete [#227819]({{kib-pull}}227819).
* Fixes several issues with `BUCKET` function signatures [#222553]({{kib-pull}}222553).
* Fixes validation issues with the `COALESCE` function [#222425]({{kib-pull}}222425).
* Fixes incorrect suggestions after a variable such as `?value` when using the `WHERE` command [#222312]({{kib-pull}}222312).
* Fixes an issue with suggestions after using triple quotes [#221200]({{kib-pull}}221200).
* Fixes a validation issue when using asterisks `*` in queries [#219832]({{kib-pull}}219832).
* Fixes an issue with incorrect source validation in case of unknown patterns [#218352]({{kib-pull}}218352).
* Fixes a display issue with the editor's menus on Safari [#218167]({{kib-pull}}218167).
* Fixes a display issue with descriptions in suggestion tooltips [#218067]({{kib-pull}}218067).
* Correctly enables the time picker when time parameters are used with cast [#215820]({{kib-pull}}215820).
* Fixes an issue preventing warnings to display correctly when they include escaped quotes [#213685]({{kib-pull}}213685).
* Fixes a validation issue when a named parameter is used as a function [#213355]({{kib-pull}}213355).
* Fixes an issue with suggestions for the `WHERE` command in case of a multiline query [#213240]({{kib-pull}}213240).

**Elastic Observability solution**:
For the Elastic Observability 9.1.0 release information, refer to [Elastic Observability Solution Release Notes](docs-content://release-notes/elastic-observability/index.md).

**Elastic Security solution**:
For the Elastic Security 9.1.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Kibana platform**:
* Removes listing limit warning [#217945]({{kib-pull}}217945).
* Adds a setting to customize the link color of the top banner [#214241]({{kib-pull}}214241).
* Updates the wording used in **Sort by** menu options [#206464]({{kib-pull}}206464).
* Passes the correct namespace to `migrateInputDocument` [#222313]({{kib-pull}}222313).

**Machine Learning**:
* Fixes unknown fields not supported in Data Visualizer and Field Statistics [#223903]({{kib-pull}}223903).
* Fixes overflow of cards in the Machine Learning **Overview** page [#223431]({{kib-pull}}223431).
* Fixes an issue with the **Use full data** button that was causing the page to crash [#217291]({{kib-pull}}217291).
* Fixes permission to view ML nodes [#215503]({{kib-pull}}215503).
* Fixes chart in single metric anomaly detection wizard [#214837]({{kib-pull}}214837).
* Prevents multiple clicks in the **Delete Model** dialog [#211580]({{kib-pull}}211580).
* Fixes further deployment of models after a failed deployment [#211459]({{kib-pull}}211459).
* Allows hiding the **Load query** and **Save query** options in the query bar menu on AIOps pages [#210556]({{kib-pull}}210556).

**Management**:
* Fixes the search functionality for spaces created with an image as their avatar type [#220398]({{kib-pull}}220398).
* Fixes styling issues in the **Edit data view** flyout [#228078]({{kib-pull}}228078).

**Search**:
* Adjusts the `z-index` of the app menu header to not conflict with the Persistent Console [#224708]({{kib-pull}}224708).
* Fixes an issue preventing solution navigation submenu items from being displayed when the navigation is collapsed [#227705]({{kib-pull}}227705).

## 9.0.8 [kibana-9.0.8-release-notes]

% ::::{NOTE}
% ::::

### Fixes [kibana-9.0.8-fixes]

**Dashboards and Visualizations**:
* Fixes text kerning issues in PDF/PNG exports of dashboards and visualizations [#235516]({{kib-pull}}235516).
* Fixes an issue where the dashboard title would not get updated in the breadcrumb when edited from the list of dashboards [#236561]({{kib-pull}}236561).
* Fixes an issue with the Lens table's column sort order being different in the dashboard and the exported CSV [#236673]({{kib-pull}}236673).

**Data ingestion and Fleet**:
* Validates the Logstash pipeline ID at the {{kib}} API level [#236347]({{kib-pull}}236347).
* Adds a unique count to improve accuracy of the number of transforms on the integrations overview page [#236177]({{kib-pull}}236177).

**Discover**:
* Clears sort by `timestamp` when navigating from classic to ES|QL mode [#235338]({{kib-pull}}235338).

**Machine Learning**:
* Hides the show forecast checkbox when selecting a new job in the Single Metric Viewer [#236724]({{kib-pull}}236724).
* Improves trained model performance by adding filters to the request to fetch all index settings [#237072]({{kib-pull}}237072).
* Makes alerts visible in Anomaly Explorer to all Machine Learning-only users regardless of where they create rules [#236289]({{kib-pull}}236289).
* Fixes the **Job details** flyout on the **Analytics Map** page [#236131]({{kib-pull}}236131).
* Limits log rate analysis category requests to reduce `msearch` usage [#235611]({{kib-pull}}235611).
* Fixes rendering of the dashboard panel in PDF reporting for the Anomaly Swim Lane [#235475]({{kib-pull}}235475).

**Management**:
* Fixes handling of special characters when creating, editing, and cloning ingest pipelines [#233651]({{kib-pull}}233651).

**Stack Management**:
* Adds the ability to do partial matches and searches in the **API keys** section [#221959]({{kib-pull}}221959).


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
* Fixes an issue that causes the CSV export to fail in Agent list [#225050]({{kib-pull}}225050).
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
* Reuses shared integration policies when duplicating agent policies [#217872](https://github.com/elastic/kibana/pull/217872).

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
  * Splits Up SLO Details from Overview. Static data that describes the SLO definition has been moved to a separate tab, making charts and valuable information about SLIs faster to access. [#212826]({{kib-pull}}212826).
  * SpaceId can now be referenced in document-based access filters for roles to restrict a user's access to SLI data for spaces where they do not have access [#214278]({{kib-pull}}214278).
  * Adds a link to the location badge on synthetics SLOs that sends to the Monitors page with a filter applied that matches the location of the origin SLO [#210695]({{kib-pull}}210695).
* Synthetics:
  * Ensures 404 is returned only if `screenshot_ref` is truly not present [#215241]({{kib-pull}}215241).

**Elastic Security solution**:
For the Elastic Security 9.0.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

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
* Infrastructure inventory:
  * Fixes an error that could prevent the Observability Infrastructure inventory view from loading after an upgrade due to missing versioning on inventory_view_saved_object [#207007]({{kib-pull}}207007).
* SLOs:
  * Fixes an issue where clicking on the name badge for a synthetics monitor on an SLO details page would lead to a page that failed to load monitor details [#210695]({{kib-pull}}210695).
  * Allows use of wildcard filters in SLO queries when DSL filters are also used [#213119]({{kib-pull}}213119).
  * Ensures that when an SLO is created, its ID is correctly verified to be unique across all spaces [#214496]({{kib-pull}}214496).

**Elastic Security solution**:
For the Elastic Security 9.0.0 release information, refer to [Elastic Security Solution Release Notes](docs-content://release-notes/elastic-security/index.md).

**Platform**:

* Fixes several interface inconsistencies on the Space creation and settings pages [#197303]({{kib-pull}}197303).
