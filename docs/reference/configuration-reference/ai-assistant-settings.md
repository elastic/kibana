---
navigation_title: "Knowledge base artifact settings for AI Assistants"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/ai-assistant-settings-kb.html
applies_to:
  deployment:
    self: ga
---

# Knowledge base artifact settings for AI Assistants [ai-assistant-settings-kb]

The `xpack.productDocBase` settings configure how {{kib}} reaches the artifact repository used to install and update knowledge base artifacts (Elastic product documentation and Security Labs) for the AI assistants. Most deployments use the default base URL of the artifact repository and only need outbound access to Elastic’s CDN. Change these settings when you use a private mirror, local files, a proxy, or otherwise cannot rely on the default host.

`xpack.productDocBase.artifactRepositoryUrl`
:   The base URL of the artifact repository from which {{kib}} lists and downloads knowledge base artifacts for AI Assistants. Defaults to `https://kibana-knowledge-base-artifacts.elastic.co`, Elastic’s public artifact host. Leave the default when {{kib}} can reach that base URL over the internet. 

    If the default host is unreachable or not permitted, set `xpack.productDocBase.artifactRepositoryUrl` to the HTTP or HTTPS base URL of a repository you operate that mirrors Elastic’s artifacts, for example, a private mirror or internal endpoint in a restricted or isolated network.

    {applies_to}`self: ga 9.1+` To read artifacts from a directory on the filesystem of the host where {{kib}} runs, use a `file://` base URL (for example `file:///path/to/artifacts`). 

    Data type: `string`

`xpack.productDocBase.artifactRepositoryProxyUrl` {applies_to}`self: ga 9.4+`
:   The HTTP or HTTPS URL of a proxy server that {{kib}} uses only for traffic to the base URL in `xpack.productDocBase.artifactRepositoryUrl`. It applies to the same outbound requests {{kib}} uses to list available artifacts and download ZIP files from that remote base URL. Unset by default. When unset, {{kib}} sends those requests directly to the host named in `xpack.productDocBase.artifactRepositoryUrl` with no proxy.

    Set this when outbound connections from {{kib}} to the artifact repository base URL (Elastic’s CDN, a private mirror, or an internal endpoint) must go through your network’s HTTP or HTTPS proxy.

    When `xpack.productDocBase.artifactRepositoryUrl` uses the `file://` scheme, {{kib}} reads artifacts from the filesystem on the {{kib}} host and does not issue HTTP or HTTPS requests to that repository base URL, so this setting has no effect.

    Data type: `string` (URI)

## Configuring product documentation for air-gapped environments [configuring-product-doc-for-airgap]

This heading is kept so existing links to `#configuring-product-doc-for-airgap` still resolve.