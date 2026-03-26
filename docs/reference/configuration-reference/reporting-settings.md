---
navigation_title: "Reporting settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/reporting-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# Reporting settings in {{kib}} [reporting-settings-kb]

You can configure `xpack.reporting` settings to:

* [Enable or disable the {{report-features}}](#general-reporting-settings)
* [Configure an encryption key to protect sensitive authentication data](#encryption-keys)
* [Choose an access control model of how users will be granted privileges to {{report-features}}](#reporting-advanced-settings)
* [Manage the way reporting tasks run in the {{kib}} server background](#reporting-job-queue-settings)
* [Control how screenshots are captured for PNG/PDF reports](#reporting-capture-settings)
* [Control the limits and capabilities of CSV reports](#reporting-csv-settings)

:::{note}
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
:::

## Enable reporting [general-reporting-settings]

:::{settings} /reference/configuration-reference/reporting-settings-enable.yml
:::

## Encryption key setting [encryption-keys]

:::{settings} /reference/configuration-reference/reporting-settings-encryption-key.yml
:::

## Security settings [reporting-advanced-settings]

Reporting privileges are configured with [{{kib}} application privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md). You can control the spaces and applications where users are allowed to generate reports.

