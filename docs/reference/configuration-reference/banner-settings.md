---
navigation_title: "Banners settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/banners-settings-kb.html
applies_to:
  deployment:
    self: all
---

# Banner settings in {{kib}} [banners-settings-kb]


Banners are disabled by default. You need to manually configure them in order to use the feature.

You can configure the `xpack.banners` settings in your `kibana.yml` file.

::::{note}
Banners are a [subscription feature](https://www.elastic.co/subscriptions).

::::


`xpack.banners.placement`
:   Set to `top` to display a banner above the Elastic header. Defaults to `disabled`.

`xpack.banners.textContent`
:   The text to display inside the banner, either plain text or Markdown.

`xpack.banners.textColor`
:   The color for the banner text. Defaults to `#8A6A0A`.

`xpack.banners.linkColor`
:   The color for the banner link text. Defaults to `#0B64DD`.

`xpack.banners.backgroundColor`
:   The color of the banner background. Defaults to `#FFF9E8`.

`xpack.banners.disableSpaceBanners`
:   If true, per-space banner overrides will be disabled. Defaults to `false`.

