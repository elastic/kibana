---
navigation_title: "Censys"
type: reference
description: "Use the Censys connector to enrich hosts, web properties, and certificates, submit assets for rescanning, and run CensEye threat-hunting jobs using the Censys Platform API."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# Censys connector [censys-action-type]

The Censys connector communicates with the [Censys Platform API](https://docs.censys.com/reference/get-started) to enrich hosts, web properties, and certificates, submit assets for rescanning, and run CensEye threat-hunting jobs.

Every request issued by the connector is scoped to the configured Censys organization.

## Create connectors in {{kib}} [define-censys-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [censys-connector-configuration]

Censys connectors have the following configuration properties:

API token
:   A Censys Platform personal access token for authentication.

Organization ID
:   The Censys organization ID.

## Test connectors [censys-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

The Censys connector has the following actions:

Get Host
:   Retrieve information about a host using its IP address.
    - **Host** (required): IPv4 or IPv6 address.

Get Web Property
:   Retrieve information about a web property using a specified hostname and port.
    - **Hostname** (required): The hostname, domain, or IP address (IPv4 or IPv6).
    - **Port** (required): Port number (1–65535).

Get Certificate
:   Retrieve information about a certificate by its SHA-256 fingerprint.
    - **Certificate** (required): 64-character SHA-256 hex string.

Get Host History
:   Retrieve the chronological scan timeline for a host over a time window.
    - **Host** (required): IPv4 or IPv6 address.
    - **Start Time** (required): RFC3339 timestamp for the start of the window (for example, `2025-01-01T00:00:00Z`).
    - **End Time** (required): RFC3339 timestamp for the end of the window. The end time must be later than the start time (for example, `2025-01-31T23:59:59Z`).

Rescan
:   Submit a host service or a web property for a fresh scan. Returns a scan ID.
    - **Type** (required): `service` to rescan a host service, or `webproperty` to rescan a web property.
    - For `service`:
        - **IP** (required): IPv4 or IPv6 address.
        - **Port** (required): port number (1–65535).
        - **Protocol** (required): application-layer protocol on the service (for example, `HTTP`, `SSH`, `TLS`).
        - **Transport Protocol** (required): one of `unknown`, `tcp`, `udp`, `icmp`, or `quic`.
    - For `webproperty`:
        - **Hostname** (required): hostname, domain, or IP address (IPv4 or IPv6).
        - **Port** (required): port number (1–65535).

Scan Status
:   Poll the status of a rescan submitted via Rescan.
    - **Scan ID** (required): The scan ID returned by Rescan.

CensEye Create Analysis Job
:   Submit a CensEye analysis job for a host, web property, or certificate. Set **Type** to the target kind and provide the matching identifier:
    - **Type** (required): `host`, `webproperty`, or `certificate`.
    - For `host`:
        - **Host** (required): IPv4 or IPv6 address.
    - For `webproperty`:
        - **Hostname** (required): hostname, domain, or IP address (IPv4 or IPv6).
        - **Port** (required): port number (1–65535).
    - For `certificate`:
        - **Certificate** (required): 64-character lowercase SHA-256 hex string.

CensEye Job Status
:   Poll the status of a CensEye job submitted via **CensEye Create Analysis Job**.
    - **Job ID** (required): The job ID returned by CensEye Create Analysis Job.

CensEye Job Result
:   Retrieve the results of a completed CensEye job.
    - **Job ID** (required): The job ID returned by **CensEye Create Analysis Job**.

## Workflow examples [censys-workflow-examples]

Rescan a host service and re-fetch the host enrichment once the scan completes:

```yaml
steps:
  - name: submit_rescan
    type: censys.rescan
    connector-id: <connector-id>
    with:
      type: service
      ip: 8.8.8.8
      port: 443
      protocol: HTTP
      transportProtocol: tcp

  - name: wait_for_scan
    type: wait
    with:
      duration: 3s

  - name: check_scan_status
    type: censys.scanStatus
    connector-id: <connector-id>
    with:
      scanId: '{{ steps.submit_rescan.output.result.tracked_scan_id }}'

  - name: refresh_host
    type: censys.getHost
    connector-id: <connector-id>
    with:
      host: 8.8.8.8
```

Run a CensEye related-infrastructure job for a host and retrieve the pivots:

```yaml
steps:
  - name: create_censeye_job
    type: censys.censEyeCreateAnalysisJob
    connector-id: <connector-id>
    with:
      type: host
      host: 8.8.8.8

  - name: wait_for_job
    type: wait
    with:
      duration: 3s

  - name: check_job_status
    type: censys.censEyeJobStatus
    connector-id: <connector-id>
    with:
      jobId: '{{ steps.create_censeye_job.output.result.job_id }}'

  - name: get_job_results
    type: censys.censEyeJobResult
    connector-id: <connector-id>
    with:
      jobId: '{{ steps.create_censeye_job.output.result.job_id }}'
```

## Connector networking configuration [censys-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings.

## Get API credentials [censys-api-credentials]

To use the Censys connector you need a personal access token and organization ID. For more information, refer to [Get Started with Censys APIs](https://docs.censys.com/reference/get-started).

::::{note}
If you belong to a Censys Starter or Enterprise organization, your admin must assign you the **API Access** role before you can use the API. Free users do not need this role.
::::

1. Sign in to the [Censys Platform](https://platform.censys.io).
2. Click your **user icon** in the upper-right corner and select **API Access**.
3. Click **Create New Token**, enter a **Token Name** (and optional description), then click **Create**.
4. In the confirmation dialog, click **Copy to clipboard** and store the token securely. The token value is only shown once.
5. On the **Personal Access Tokens** page, ensure your organization account is selected. In the **Current Organization** box, click **Copy** to copy your **Organization ID**. Censys Starter, Search, and Enterprise organizations have an organization ID; Free accounts do not.
6. In {{kib}}, paste the token into the **API Token** field and the organization ID into the **Organization ID** field when configuring the connector.
