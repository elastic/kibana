---
navigation_title: "Deprecations"
---

# Kibana deprecations [kibana-deprecations]
Over time, certain Elastic functionality becomes outdated and is replaced or removed. To help with the transition, Elastic deprecates functionality for a period before removal, giving you time to update your applications.

Review the deprecated functionality for Kibana. While deprecations have no immediate impact, we strongly encourage you update your implementation after you upgrade. To learn how to upgrade, check out [Upgrade](docs-content://deploy-manage/upgrade.md).

% ## Next version [kibana-versionnext-deprecations]

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

## 9.0.0 [kibana-900-deprecations]

::::{dropdown} Scripted field creation has been disabled in the Data Views management page
The ability to create new scripted fields has been removed from the **Data Views** management page in 9.0. Existing scripted fields can still be edited or deleted, and the creation UI can be accessed by navigating directly to `/app/management/kibana/dataViews/dataView/{{dataViewId}}/create-field`, but we recommend migrating to runtime fields or ES|QL queries instead to prepare for removal.

**Impact**<br> It will no longer be possible to create new scripted fields directly from the **Data Views** management page.

**Action**<br> Migrate to runtime fields or ES|QL instead of creating new scripted fields. Existing scripted fields can still be edited or deleted.

View [#202250](https://github.com/elastic/kibana/pull/202250).
::::