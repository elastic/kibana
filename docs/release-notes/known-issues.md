---
navigation_title: "Kibana"
---

# Kibana known issues

% What needs to be done: Write from scratch

::::{dropdown} Now HTTP/2 is the default protocol when TLS is enabled and a deprecation warning appears if HTTP/2 is not enabled or TLS is not configured (9.0.0)
:name: known-issue-204384

**Details**<br> Starting from version 9.0.0, HTTP/2 is the default protocol when TLS is enabled. This ensures improved performance and security. However, if HTTP/2 is not enabled or TLS is not configured, a deprecation warning will be added.

For more information, refer to [#204384](https://github.com/elastic/kibana/pull/204384).

**Impact**<br> Systems that have TLS enabled but don’t specify a protocol will start using HTTP/2 in 9.0.0. Systems that use HTTP/1 or don’t have TLS configured will get a deprecation warning.

**Action**<br> Verify that TLS is properly configured by enabling it and providing valid certificates in the settings. Test your system to ensure that connections are established securely over HTTP/2.

If your Kibana server is hosted behind a load balancer or reverse proxy we recommend testing your deployment configuration before upgrading to 9.0.

::::


::::{dropdown} Search sessions disabled by default (9.0.0)
:name: known-issue-206998

**Details**<br> Starting from version 9.0.0, search sessions are disabled by default. To view, manage, and restore search sessions, the feature needs to be explicitly re-enabled.

**Impact**<br> Search sessions will be disabled unless they are explicitly enabled in config.yml.

**Action**<br> If you would like to continue using, managing, and restoring search sessions in 9.0, you’ll need to re-enable the feature in your kibana.yml configuration file. If not, no action is necessary.

To re-enable search sessions, add the following in your config.yml:

```
data.search.sessions.enabled: true
```

::::
