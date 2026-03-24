---
navigation_title: "Knowledge base artifact settings for AI Assistants"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/ai-assistant-settings-kb.html
applies_to:
  deployment:
    self: all
---

# Knowledge base artifact settings for AI Assistants [ai-assistant-settings-kb]

These settings configure how {{kib}} reaches the artifact repository used to install and update knowledge base artifacts (Elastic product documentation and Security Labs) for the AI assistants. Most deployments use the default repository URL and only need outbound access to Elastic’s CDN. Change these settings when you use a private mirror, local files, a proxy, or otherwise cannot rely on the default host.

`xpack.productDocBase.artifactRepositoryUrl`
:   The URL of the artifact repository that {{kib}} queries to list and download knowledge base artifacts for AI Assistants. Defaults to `https://kibana-knowledge-base-artifacts.elastic.co`, Elastic’s public artifact host. Leave the default when {{kib}} can reach that URL over the internet. 

    If the default host is unreachable or not permitted, set `xpack.productDocBase.artifactRepositoryUrl` to the HTTP or HTTPS URL of a repository you operate that mirrors Elastic’s artifacts, for example, a private mirror or internal endpoint in a restricted or isolated network.

    {applies_to}`stack: ga 9.1+` To read artifacts from a local directory on the {{kib}} host, use a `file://` URL.

    Data type: `string`

`xpack.productDocBase.artifactRepositoryProxyUrl` {applies_to}`stack: ga 9.4`
:   Optional HTTP or HTTPS proxy URL for the HTTP or HTTPS requests {{kib}} makes to `xpack.productDocBase.artifactRepositoryUrl` when listing and downloading artifacts from a remote repository. Unset by default. When unset, {{kib}}'s requests go to the host in `xpack.productDocBase.artifactRepositoryUrl` without a proxy. 
    
    This setting does not apply when `xpack.productDocBase.artifactRepositoryUrl` is a `file://` URL, because {{kib}} reads local files from the host's disk instead of issuing HTTP or HTTPS requests.

    Data type: `string` (URI)
