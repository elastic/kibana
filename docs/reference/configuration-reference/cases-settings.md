---
navigation_title: "Cases settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/cases-settings.html
applies_to:
  deployment:
    self: all
---

# Cases settings in {{kib}} [cases-settings]


You do not need to configure any additional settings to use [cases](docs-content://explore-analyze/alerts-cases/cases.md) in {{kib}}. To provide greater control over case features, you can configure the following settings in the `kibana.yml` file:

`xpack.cases.files.allowedMimeTypes`
:   The MIME types that you can attach to a case, represented in an array of strings. For example: `['image/tiff','text/csv','application/zip'].` The default MIME types are specified in [mime_types.ts](https://github.com/elastic/kibana/blob/master/x-pack/platform/plugins/shared/cases/common/constants/mime_types.ts).

`xpack.cases.files.maxSize`
:   The size limit for files that you can attach to a case, represented as the number of bytes. By default, the limit is 10 MiB for images and 100 MiB for all other MIME types. If you specify a value for this setting, it affects all file types.

