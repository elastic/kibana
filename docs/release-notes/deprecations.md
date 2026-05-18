---
navigation_title: "Deprecations"
---

# Kibana deprecations [kibana-deprecations]
Over time, certain Elastic functionality becomes outdated and is replaced or removed. To help with the transition, Elastic deprecates functionality for a period before removal, giving you time to update your applications.

Review the deprecated functionality for Kibana. While deprecations have no immediate impact, we strongly encourage you update your implementation after you upgrade. To learn how to upgrade, check out [Upgrade](docs-content://deploy-manage/upgrade.md).

% ## Next version [kibana-X.X.X-deprecations]

% Use the following template to add entries to this document.

% TEMPLATE START
% $$$kibana-PR_NUMBER$$$
% ::::{dropdown} Deprecation title
% Description of the deprecation.
% **Impact**<br> Impact of the deprecation.
% **Action**<br> Steps for mitigating impact.
% View [PR #](PR link).
% ::::
% TEMPLATE END

% 1. Copy and edit the template in the right area section of this file. Most recent entries should be at the top of the section. 
% 2. Edit the anchor ID ($$$kibana-PR_NUMBER$$$) of the template with the correct PR number to give the entry a unique URL. 
% 3. Don't hardcode the link to the new entry. Instead, make it available through the doc link service files:
%   - {kib-repo}blob/{branch}/src/platform/packages/shared/kbn-doc-links/src/get_doc_links.ts
%   - {kib-repo}blob/{branch}/src/platform/packages/shared/kbn-doc-links/src/types.ts
% 
% The entry in the main links file should look like this:
% 
% id: `${KIBANA_DOCS}deprecations.html#kibana-PR_NUMBER`
% 
% 4. You can then call the link from any Kibana code. For example: `href: docLinks.links.upgradeAssistant.id`
% Check https://docs.elastic.dev/docs/kibana-doc-links (internal) for more details about the Doc links service.

## 9.4.0 [kibana-9.4.0-deprecations]

$$$kibana-263694$$$
::::{dropdown} Direct AI connector step types deprecated in favor of `ai.prompt`
**Details**<br> All direct AI connector workflow step types (`inference.*`, `bedrock.*`, `gen-ai.*`, `gemini.*`) are now deprecated. These steps are hidden from autocomplete suggestions and the **Add Action** menu in the workflow editor. Existing workflows using these step types continue to work but display a deprecation warning.

**Impact**<br> New workflows cannot easily discover or add direct AI connector steps. Existing workflows remain functional but show deprecation warnings in the editor.

**Action**<br> Migrate workflows to use the purpose-built `ai.prompt` step instead of direct AI connector steps. The `ai.prompt` step provides a consistent interface for AI operations regardless of the underlying connector type.

View [#263694]({{kib-pull}}263694).
::::

$$$kibana-242972$$$
::::{dropdown} Deprecated `state:storeInSessionStorage` advanced setting
**Details**<br> The artificial URL length limit has been removed from Kibana, and the `state:storeInSessionStorage` advanced setting is now deprecated. This setting was originally provided as a workaround for URL length limits in older browsers. Modern browsers no longer have these limits, and using this setting can prevent copying and pasting URLs directly between tabs.

**Impact**<br> The `state:storeInSessionStorage` setting will be removed in a future version. Enabling this setting may cause issues with URL sharing in Discover and Dashboards.

**Action**<br> Disable the `state:storeInSessionStorage` setting if it is currently enabled. Go to **Stack Management** > **Advanced Settings** and set `state:storeInSessionStorage` to `false`.

View [#242972]({{kib-pull}}242972).
::::

## 9.3.0 [kibana-9.3.0-deprecations]

There are no deprecations in this version.

## 9.2.0 [kibana-9.2.0-deprecations]

There are no deprecations in this version.

## 9.1.0 [kibana-9.1.0-deprecations]

There are no deprecations in this version.

## 9.0.0 [kibana-900-deprecations]

::::{dropdown} HTTP/2 becomes the default protocol when TLS is enabled
:name: known-issue-204384

**Details**<br> Starting from version 9.0.0, HTTP/2 is the default protocol when TLS is enabled. This ensures improved performance and security. However, if HTTP/2 is not enabled or TLS is not configured, a deprecation warning will be added.

**Impact**<br> Systems that have TLS enabled but don’t specify a protocol will start using HTTP/2 in 9.0.0. Systems that use HTTP/1 or don’t have TLS configured will get a deprecation warning.

**Action**<br> Verify that TLS is properly configured by enabling it and providing valid certificates in the settings. Test your system to ensure that connections are established securely over HTTP/2.

If your Kibana server is hosted behind a load balancer or reverse proxy we recommend testing your deployment configuration before upgrading to 9.0.

View [#204384](https://github.com/elastic/kibana/pull/204384).
::::

::::{dropdown} Scripted field creation has been disabled in the Data Views management page
The ability to create new scripted fields has been removed from the **Data Views** management page in 9.0. Existing scripted fields can still be edited or deleted, and the creation UI can be accessed by navigating directly to `/app/management/kibana/dataViews/dataView/{{dataViewId}}/create-field`, but we recommend migrating to runtime fields or ES|QL queries instead to prepare for removal.

**Impact**<br> It will no longer be possible to create new scripted fields directly from the **Data Views** management page.

**Action**<br> Migrate to runtime fields or ES|QL instead of creating new scripted fields. Existing scripted fields can still be edited or deleted.

View [#202250](https://github.com/elastic/kibana/pull/202250).
::::