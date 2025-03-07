---
navigation_title: "Kibana"
---

# Kibana deprecations [kibana-deprecations]
Review the deprecated functionality for your Kibana version. While deprecations have no immediate impact, we strongly encourage you update your implementation after you upgrade.

To learn how to upgrade, check out <uprade docs>.

% ## Next version [kibana-versionnext-deprecations]
% **Release date:** Month day, year

% ::::{dropdown} Deprecation title
% Description of the deprecation.
% For more information, check [PR #](PR link).
% **Impact**<br> Impact of deprecation. 
% **Action**<br> Steps for mitigating deprecation impact.
% ::::

## 9.0.0 [kibana-900-deprecations]
**Release date:** March 25, 2025

::::{dropdown} Scripted field creation has been disabled in the Data Views management page
The ability to create new scripted fields has been removed from the **Data Views** management page in 9.0. Existing scripted fields can still be edited or deleted, and the creation UI can be accessed by navigating directly to `/app/management/kibana/dataViews/dataView/{{dataViewId}}/create-field`, but we recommend migrating to runtime fields or ES|QL queries instead to prepare for removal.

For more information, check [#202250](https://github.com/elastic/kibana/pull/202250).

**Impact**<br> It will no longer be possible to create new scripted fields directly from the **Data Views** management page.

**Action**<br> Migrate to runtime fields or ES|QL instead of creating new scripted fields. Existing scripted fields can still be edited or deleted.
::::