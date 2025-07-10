---
navigation_title: "Spaces settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/spaces-settings-kb.html
applies_to:
  deployment:
    self: all
---

# Spaces settings in {{kib}} [spaces-settings-kb]


By default, spaces is enabled in {{kib}}. To secure spaces, [enable security](/reference/configuration-reference/security-settings.md).

`xpack.spaces.maxSpaces`
:   The maximum number of spaces that you can use with the {{kib}} instance. Some {{kib}} operations return all spaces using a single `_search` from {{es}}, so you must configure this setting lower than the `index.max_result_window` in {{es}}. The default is `1000`.

