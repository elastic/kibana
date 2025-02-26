---
navigation_title: "Kibana"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/breaking-changes-summary.html
---

# Kibana breaking changes [kibana-breaking-changes]
Before you upgrade, carefully review the Kibana breaking changes and take the necessary steps to mitigate any issues. 

If you are migrating from a version prior to version 9.0, you must first upgrade to the last 8.x version available. To learn how to upgrade, check out <uprade docs>.

% ## Next version [kibana-nextversion-breaking-changes]
% **Release date:** Month day, year

% ::::{dropdown} Title of breaking change 
% Description of the breaking change.
% For more information, check [PR #](PR link).
% **Impact**<br> Impact of the breaking change.
% **Action**<br> Steps for mitigating deprecation impact.
% ::::

## 9.0.0 [kibana-900-breaking-changes]
**Release date:** March 25, 2025

::::{dropdown} Removed legacy alerting endpoints
* `POST /api/alerts/alert/{id?}` has been replaced by `POST /api/alerting/rule/{id?}`
* `GET /api/alerts/alert/{{id}}` has been replaced by `GET /api/alerting/rule/{{id}}`
* `PUT /api/alerts/alert/{{id}}` has been replaced by `PUT /api/alerting/rule/rule/{{id}}`
* `DELETE: /api/alerts/alert/{{id}}` has been replaced by `DELETE /api/alerting/rule/{{id}}`
* `POST /api/alerts/alert/{{id}}/_disable` has been replaced by `POST /api/alerting/rule/{{id}}/_disable`
* `POST /api/alerts/alert/{{id}}/_enable` has been replaced by `POST /api/alerting/rule/{{id}}/_enable`
* `GET /api/alerts/_find` has been replaced by `GET /api/alerting/rules/_find`
* `GET /api/alerts/_health` has been replaced by `GET /api/alerting/rule/_health`
* `GET /api/alerts/list_alert_types` has been replaced by `GET /api/alerting/rule_types`
* `POST /api/alerts/alert/{{alert_id}}/alert_instance/{{alert_instance_id}}/_mute` has been replaced by `POST /api/alerting/rule/{{rule_id}}/alert/{{alert_id}}/_mute`
* `POST /api/alerts/alert/{{alert_id}}/alert_instance/{{alert_instance_id}}/_unmute` has been replaced by `POST /api/alerting/rule/{{rule_id}}/alert/{{alert_id}}/_unmute`
* `POST /api/alerts/alert/{{id}}/_mute_all` has been replaced by `POST /api/alerting/rule/{{id}}/_mute_all`
* `POST /api/alerts/alert/{{id}}/_unmute_all` has been replaced by `POST /api/alerting/rule/{{id}}/_unmute_all`
* `POST /api/alerts/alert/{{id}}/_update_api_key` has been replaced by `POST /api/alerting/rule/{{id}}/_update_api_key`
* `GET /api/alerts/{{id}}/_instance_summary` has been deprecated without replacement. Will be removed in v9.0.0
* `GET /api/alerts/{{id}}/state` has been deprecated without replacement. Will be removed in v9.0.0

**Impact**<br> Deprecated endpoints will fail with a 404 status code starting from version 9.0.0.

**Action**<br> Remove references to `GET /api/alerts/{{id}}/_instance_summary` endpoint. Remove references to `GET /api/alerts/{{id}}/state` endpoint. Replace references to endpoints listed as deprecated by it’s replacement. See `Details` section. The updated APIs can be found in [https://www.elastic.co/docs/api/doc/kibana/group/endpoint-alerting](https://www.elastic.co/docs/api/doc/kibana/group/endpoint-alerting).
::::

:::{dropdown} Removed legacy cases endpoints
* `GET /api/cases/status` has been deprecated with no replacement. Deleted in v9.0.0
* `GET /api/cases/{{case_id}}/comments` has been replaced by `GET /api/cases/{{case_id}}/comments/_find` released in v7.13
* `GET /api/cases/<case_id>/user_actions` has been replaced by `GET /api/cases/<case_id>/user_actions/_find` released in v8.7
* `includeComments` parameter in `GET /api/cases/{{case_id}}` has been deprecated. Use `GET /api/cases/{{case_id}}/comments/_find` instead, released in v7.13

**Impact**<br> Deprecated endpoints will fail with a 404 status code starting from version 9.0.0.

**Action**<br> Remove references to `GET /api/cases/status` endpoint. Replace references to deprecated endpoints with the replacements listed in the breaking change details.
::::

:::{dropdown} Removed all security v1 endpoints
All `v1` Kibana security HTTP endpoints have been removed.

`GET /api/security/v1/logout` has been replaced by `GET /api/security/logout` `GET /api/security/v1/oidc/implicit` has been replaced by `GET /api/security/oidc/implicit` `GET /api/security/v1/oidc` has been replaced by GET `/api/security/oidc/callback` `POST /api/security/v1/oidc` has been replaced by POST `/api/security/oidc/initiate_login` `POST /api/security/v1/saml` has been replaced by POST `/api/security/saml/callback` `GET /api/security/v1/me` has been removed with no replacement.

For more information, check [#199656](https://github.com/elastic/kibana/pull/199656).

**Impact**<br> Any HTTP API calls to the `v1` Kibana security endpoints will fail with a 404 status code starting from version 9.0.0. Third party OIDC and SAML identity providers configured with `v1` endpoints will no longer work.

**Action**<br> Update any OIDC and SAML identity providers to reference the corresponding replacement endpoint listed above. Remove references to the `/api/security/v1/me` endpoint from any automations, applications, tooling, and scripts.
::::

:::{dropdown} Access to all internal APIs is blocked
Access to internal Kibana HTTP APIs is restricted from version 9.0.0. This is to ensure that HTTP API integrations with Kibana avoid unexpected breaking changes. Refer to [#193792](https://github.com/elastic/kibana/pull/193792).

**Impact**<br> Any HTTP API calls to internal Kibana endpoints will fail with a 400 status code starting from version 9.0.0.

**Action**<br> **Do not integrate with internal HTTP APIs**. They may change or be removed without notice, and lead to unexpected behaviors. If you would like some capability to be exposed over an HTTP API, [create an issue](https://github.com/elastic/kibana/issues/new/choose). We would love to discuss your use case.
::::

:::{dropdown} Remove original user and host risk scoring and all associated UIs
The original host and risk score modules have been superseded since v8.10.0 by the Risk Engine.

In 9.0.0 these modules are no longer supported, the scores no longer display in the UI and all UI controls associated with managing or upgrading the legacy modules have been removed.

**Impact**<br> As well as the legacy risk scores not being shown in the UI, alerts no longer have the legacy risk score added to them in the `<host|user>.risk.calculated_level` and `<host|user>.risk.calculated_score_norm` fields.

The legacy risk scores are stored in the `ml_host_risk_score_<space_id>` and `ml_user_risk_score_<space_id>` indices, these indices will not be deleted if the user chooses not to upgrade.

Legacy risk scores are generated by the following transforms:

* `ml_hostriskscore_pivot_transform_<space_id>`
* `ml_hostriskscore_latest_transform_<space_id>`
* `ml_userriskscore_pivot_transform_<space_id>`
* `ml_userriskscore_latest_transform_<space_id>`

If a user does not upgrade to use the Risk Engine, these transforms will continue to run in 9.0.0, but it will be up to the user to manage them.

**Action**<br> Upgrade to use the Risk Engine in all spaces which use the legacy risk scoring modules:

* In the main menu, go to **Security > Manage > Entity Risk Score**.
* If the original user and host risk score modules are enabled, you’ll see a button to "Start update". Click the button, and follow the instructions.
::::

:::{dropdown} Reporting uses Kibana feature privileges only to control access to reporting features
In 8.x, the default access control model was based on a built-in role called `reporting_user`, which granted access to reporting features. Since 7.13, the preferred model for controlling access to reporting features has been Kibana feature privileges, enabled by setting `xpack.reporting.roles.enabled: false` in `kibana.yml`.

In 9.0.0, the `xpack.reporting.roles.*` settings will be ignored.

**Impact**<br> The built-in `reporting_user` role is no longer deprecated and provides access to reporting features using Kibana feature privileges. This means that users that do not have privileges to use reporting will not see reporting features in the Kibana UI.

**Action**<br> Use Kibana feature privileges to control access to reporting features. For more information, see [#200834](https://github.com/elastic/kibana/pull/200834).

* The `reporting_user` role is still supported, but gives full access to all reporting features. We recommend creating custom roles with minimal privileges in **Stack Management > Roles**.
* The `xpack.reporting.roles.allow` setting is no longer supported. If you have a `xpack.reporting.roles.allow` value in your `kibana.yml`, you should remove this setting and assign privileges to reporting features using Kibana feature privileges.
::::

:::{dropdown} Saved query privileges have been reworked
Saved query privileges have been reworked to rely solely on a single global `savedQueryManagement` privilege, and eliminate app-specific overrides (e.g. implicit access with `all` privilege for Discover, Dashboard, Maps, and Visualize apps). This change simplifies the security model and ensures consistency in the saved query management UI across Kibana, but results in different handling of saved query privileges for new user roles, and minor breaking changes to the existing management UX. For more information, check [#202863](https://github.com/elastic/kibana/pull/202863). 

**Impact**<br> The `savedQueryManagement` feature privilege now globally controls access to saved query management for all new user roles. Regardless of privileges for Discover, Dashboard, Maps, or Visualize, new user roles follow this behaviour: . If `savedQueryManagement` is `none`, the user cannot see or access the saved query management UI or APIs. . If `savedQueryManagement` is `read`, the user can load queries from the UI and access read APIs, but cannot save queries from the UI or make changes to queries through APIs. . If `savedQueryManagement` is `all`, the user can both load and save queries from the UI and through APIs. 

**Action**<br> Existing user roles that were previously implicitly granted access to saved queries through the dashboard, discover, visualize, or maps feature privileges will retain that access to prevent breaking changes. While no action is required for existing roles, it’s still advisable to audit relevant roles and re-save them to migrate to the latest privileges model. For new roles, ensure that the savedQueryManagement privilege is set as needed.
::::