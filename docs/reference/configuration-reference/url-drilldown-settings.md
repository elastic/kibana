---
navigation_title: "URL drilldown settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/url-drilldown-settings-kb.html
applies_to:
  deployment:
    self: all
---

# URL drilldown settings in {{kib}} [url-drilldown-settings-kb]


Configure the URL drilldown settings in your `kibana.yml` configuration file.

$$$external-URL-policy$$$ `externalUrl.policy`
:   Configures the external URL policies. URL drilldowns respect the global **External URL** service, which you can use to deny or allow external URLs. By default all external URLs are allowed.

    For example, to allow only external URLs to the `example.com` domain with the `https` scheme, except for the `danger.example.com` sub-domain, which is denied even when `https` scheme is used:

    ```yaml
    externalUrl.policy:
      - allow: false
        host: danger.example.com
      - allow: true
        host: example.com
        protocol: https
    ```


