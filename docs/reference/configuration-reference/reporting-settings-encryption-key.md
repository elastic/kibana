---
navigation_title: "Encryption key setting"
applies_to:
  deployment:
    ess: all
    self: all
---

# Encryption key setting [encryption-keys]

By default, an encryption key is generated for the {{report-features}} each time you start {{kib}}. If a static encryption key is not persisted in the {{kib}} configuration, any pending reports fail when you restart {{kib}}.

If you are load balancing across multiple {{kib}} instances, each instance needs to have the same reporting encryption key. Otherwise, report generation fails if a report is queued through one instance, and another instance picks up the job from the report queue. The instance that picks up the job is unable to decrypt the reporting job metadata.

$$$xpack-reporting-encryptionKey$$$ `xpack.reporting.encryptionKey` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The static encryption key for reporting. Use an alphanumeric text string that is at least 32 characters. By default, {{kib}} generates a random key when it starts, which causes pending reports to fail after restart. Configure `xpack.reporting.encryptionKey` to preserve the same key across multiple restarts and multiple {{kib}} instances.

```yaml
xpack.reporting.encryptionKey: "something_secret"
```
