---
navigation_title: "Knowledge base artifact settings for AI Assistants"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/ai-assistant-settings-kb.html
applies_to:
  deployment:
    stack: ga
---

# Knowledge base artifact settings for AI Assistants [ai-assistant-settings-kb]

These `xpack.productDocBase` settings configure how {{kib}} reaches the artifact repository used to install and update knowledge base artifacts (Elastic product documentation and Security Labs) for the AI assistants. Most deployments use the default repository URL and only need outbound access to Elastic’s CDN. Change these settings when you use a private mirror, local files, a proxy, or otherwise cannot rely on the default host.

`xpack.productDocBase.artifactRepositoryUrl`
:   The URL of the artifact repository that {{kib}} queries to list and download knowledge base artifacts for AI Assistants. Defaults to `https://kibana-knowledge-base-artifacts.elastic.co`, Elastic’s public artifact host. Leave the default when {{kib}} can reach that URL over the internet. 

    If the default host is unreachable or not permitted, set `xpack.productDocBase.artifactRepositoryUrl` to the HTTP or HTTPS URL of a repository you operate that mirrors Elastic’s artifacts, for example, a private mirror or internal endpoint in a restricted or isolated network.

    {applies_to}`self: ga 9.1+` To read artifacts from a directory on the filesystem of the host where {{kib}} runs, use a `file://` URL. This is practical in self-managed environments where you control that host and can place the artifact files there. For {{ech}} and similar managed offerings, you typically cannot use the {{kib}} host’s filesystem as your artifact store. You must use an HTTP or HTTPS URL for your private mirror, internal S3, or CDN that serves the same kind of listing and ZIP files as Elastic’s public artifact repo.

    Data type: `string`

`xpack.productDocBase.artifactRepositoryProxyUrl` {applies_to}`stack: ga 9.4`
:   HTTP or HTTPS URL of a proxy server that {{kib}} uses only for traffic to `xpack.productDocBase.artifactRepositoryUrl` when that value is an `http` or `https` URL. It applies to the same outbound requests {{kib}} uses to list available artifacts and download ZIP files from that remote URL. Unset by default. When unset, {{kib}} sends those requests directly to the host in `xpack.productDocBase.artifactRepositoryUrl` with no proxy.

    Set this when outbound connections from {{kib}} to the artifact repository (Elastic’s CDN, a private mirror, or an internal endpoint) must go through your network’s HTTP or HTTPS proxy.

    When `xpack.productDocBase.artifactRepositoryUrl` uses the `file://` scheme, {{kib}} reads artifacts from the filesystem on the {{kib}} host and does not issue HTTP or HTTPS requests to the repository URL, so this setting has no effect.

    Data type: `string` (URI)

## Configuring product documentation for air-gapped environments [configuring-product-doc-for-airgap]

Adding this temp section so existing links to `#configuring-product-doc-for-airgap` still resolve. I'll update this section once I add merge the PR that adds the *Host product documentation artifacts for AI assistants* page docs-content. Potential text:

This page only explains how to configure the `xpack.productDocBase` settings. For procedures to mirror artifact ZIPs (S3-style bucket, CDN, or local layout), refer to [Host product documentation artifacts for AI assistants], and apply the `xpack.productDocBase` values described here.
