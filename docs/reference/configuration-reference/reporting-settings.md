---
navigation_title: 'Reporting settings'
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/reporting-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# Reporting settings in {{kib}} [reporting-settings-kb]

You can configure `xpack.reporting` settings to:

- [Enable or disable the {{report-features}}](#general-reporting-settings)
- [Configure an encryption key to protect sensitive authentication data](#encryption-keys)
- [Choose an access control model of how users will be granted privileges to {{report-features}}](#reporting-advanced-settings)
- [Manage the way reporting tasks run in the {{kib}} server background](#reporting-job-queue-settings)
- [Control how screenshots are captured for PNG/PDF reports](#reporting-capture-settings)
- [Control the limits and capabilities of CSV reports](#reporting-csv-settings)

## Serverless availability [reporting-serverless-availability]

On {{serverless-full}}, reporting support depends on the surface and export type. These `xpack.reporting` settings are not user-configurable there.

| Surface                                       | Generate      | Schedule |
| --------------------------------------------- | ------------- | -------- |
| Discover CSV                                  | Yes           | Yes      |
| Lens CSV                                      | Download only | No       |
| Dashboard, Lens, and visualization PDF or PNG | No            | No       |
| Dashboard JSON                                | Yes           | n/a      |

PDF and PNG export types default to disabled (`xpack.reporting.export_types.pdf.enabled` and `xpack.reporting.export_types.png.enabled` are `false`) and cannot be turned on.

Compared with {{ech}}, Serverless does not generate or schedule dashboard PDF or PNG reports.

For user-facing steps, refer to [Reporting and sharing](docs-content://explore-analyze/report-and-share.md) and [Automatically generate reports](docs-content://explore-analyze/report-and-share/automating-report-generation.md).

## Enable reporting [general-reporting-settings]

:::{settings} /reference/configuration-reference/reporting-settings-enable.yml
:::

## Encryption key setting [encryption-keys]

:::{settings} /reference/configuration-reference/reporting-settings-encryption-key.yml
:::

## Security settings [reporting-advanced-settings]

Reporting privileges are configured with [{{kib}} application privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md). You can control the spaces and applications where users are allowed to generate reports.

## Background job settings [reporting-job-queue-settings]

:::{settings} /reference/configuration-reference/reporting-settings-background-job.yml
:::

## PNG/PDF settings [reporting-capture-settings]

:::{settings} /reference/configuration-reference/reporting-settings-png-pdf.yml
:::

## CSV settings [reporting-csv-settings]

:::{settings} /reference/configuration-reference/reporting-settings-csv.yml
:::
