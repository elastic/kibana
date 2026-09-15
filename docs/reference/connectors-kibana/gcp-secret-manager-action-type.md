---
navigation_title: "Google Cloud Secret Manager"
type: reference
description: "Use the Google Cloud Secret Manager connector to read secret metadata, store new secret versions, and disable, enable, or destroy versions so a workflow can drive credential rotation and revocation."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google Cloud Secret Manager connector [gcp-secret-manager-action-type]

The Google Cloud Secret Manager connector lets a workflow drive credential rotation and revocation without an operator opening the Google Cloud console. It lists and inspects secrets, stores new secret versions, disables and re-enables versions, destroys retired ones, and reads the access policy on a secret.

## Overview

This is a **custom connector** that calls the Google Cloud Secret Manager API (`secretmanager.googleapis.com`). You upload a service account JSON key when creating the connector; every action then runs as that service account, using a short-lived access token the connector mints for each request.

A secret in Secret Manager is a named container, and its values are stored as immutable numbered versions. Reading a value means reading a specific version, and rotating a credential means adding a new version and then disabling the old one.

### How secret values are handled

Secret Manager is unusual among connectors in that one of its endpoints returns live credential material. The connector is deliberately conservative about it:

* `accessSecretVersion` **withholds the secret value by default**. It returns the version name, the byte length, and the API's crc32c, which is enough for a workflow to confirm that a rotation landed without the secret being exposed. No digest of the value is returned: real secrets are often short enough that an unsalted hash sitting in an execution record would itself be brute-forceable.
* The value is returned only when a workflow author explicitly sets `revealPayload` to `true`. When they do, the value is written into the workflow execution record, where anyone who can read that execution can read the secret.
* `accessSecretVersion` is **not available as an agent tool**, so an AI agent cannot read a secret value autonomously. Neither are the actions that write or destroy data. Metadata reads are available to both workflows and agents.

## Create connectors in {{kib}} [define-gcp-secret-manager-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [gcp-secret-manager-connector-configuration]

Google Cloud Secret Manager connectors have the following configuration properties:

Service account JSON key
:   The JSON key file for the service account the connector authenticates as. Stored encrypted. Required.

Default project ID
:   Optional. Recorded for reference and used by the **Test connector** button, for example `my-project-123`. Every action takes an explicit project ID.

## Connector actions [gcp-secret-manager-connector-actions]

### Secrets

`listSecrets`
:   Lists the secrets in a project with ID, labels, replication, rotation policy, and version aliases. Supports an optional filter in Secret Manager filter syntax. Returns metadata only, never a secret value. Paginated: keep passing the returned page token until it is absent.

`getSecret`
:   Gets one secret container: labels, replication policy, rotation schedule, TTL, expiry, version aliases, and etag. Returns metadata only. The returned resource name uses the project number rather than the project ID, so do not feed it back as an ID.

`createSecret`
:   Creates an empty secret container. Pair it with `addSecretVersion` to provision a new credential, because a secret with no versions holds no value. Replication defaults to automatic; user-managed replication requires a list of regions.

`updateSecret`
:   Updates labels, TTL or expiry, version aliases, or the rotation schedule. Labels and version aliases are replaced wholesale rather than merged, so read the current values first. Cannot change a secret value.

`deleteSecret`
:   Deletes a secret and all of its versions permanently. There is no undelete. Prefer `disableSecretVersion` for revocation.

### Versions

`listSecretVersions`
:   Lists the versions of a secret with each version number and its state (`ENABLED`, `DISABLED`, or `DESTROYED`). The triage read a rotation depends on. Returns metadata only.

`getSecretVersion`
:   Gets the metadata of one version, including its state and scheduled destroy time. Does not return the secret value.

`accessSecretVersion`
:   Reads a version and verifies it. Returns metadata and integrity proof by default, and the decoded secret value only when `revealPayload` is set to `true`. See [How secret values are handled](#how-secret-values-are-handled) before opting in. Not available as an agent tool.

`addSecretVersion`
:   Stores a new version, which becomes the new `latest`. The create half of a rotation. It does not disable the previous version, so deploy the new value first and then disable the old version.

`disableSecretVersion`
:   Disables one version so it can no longer be accessed, without destroying it. The safe, reversible first step of a rotate-and-revoke workflow. Anything still reading that version starts failing immediately.

`enableSecretVersion`
:   Re-enables a disabled version. The rollback when a rotation broke a consumer. A destroyed version cannot be enabled.

`destroySecretVersion`
:   Permanently destroys the value of a version. Not reversible. The version stays listed with state `DESTROYED` as an audit record, but the value is unrecoverable.

### Access policy

`getSecretIamPolicy`
:   Reads the IAM policy attached directly to one secret, with every role binding, its members, any IAM conditions, and the etag. An empty binding list does **not** mean nobody can read the secret, because access is usually inherited from the project.

`setSecretIamPolicy`
:   Replaces the entire IAM policy on one secret. Any binding missing from the input is revoked. Build the bindings from a `getSecretIamPolicy` response and pass back its etag. Revoking here does not remove access inherited from the project.

## Usage notes [gcp-secret-manager-usage-notes]

* A rotation is: `listSecretVersions` to see what exists, `addSecretVersion` with the new credential, deploy it, `disableSecretVersion` on the old version number, then `destroySecretVersion` once you are confident.
* The `latest` alias resolves to the newest enabled version, so it moves when a version is added or disabled. For a lifecycle change always pass an explicit version number, otherwise a concurrent `addSecretVersion` can redirect the call to the wrong version.
* Disabling every version leaves the secret unreadable and `accessSecretVersion` then fails. That is a valid full-revocation outcome rather than an error.
* Pass a secret value to `addSecretVersion` as plain text. The connector base64-encodes it for the API, so do not pre-encode.
* Supply an `etag` from a previous read on a lifecycle or delete action to make the call fail rather than act on something that changed underneath you.

## Get API credentials [gcp-secret-manager-api-credentials]

To use the Google Cloud Secret Manager connector you need a Google Cloud service account and a JSON key for it:

1. In the Google Cloud console, open **IAM & Admin > Service Accounts** and either pick an existing service account or create one for the connector.
2. Grant the service account the roles it needs. Granting only what the actions you intend to use require keeps the connector least-privileged:
   * **Secret Manager Viewer** (`roles/secretmanager.viewer`) to list and inspect secrets and versions, and to read a secret's IAM policy.
   * **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`) to read a secret value with `accessSecretVersion`.
   * **Secret Manager Secret Version Manager** (`roles/secretmanager.secretVersionManager`) to add, disable, enable, or destroy versions.
   * **Secret Manager Admin** (`roles/secretmanager.admin`) to create or delete secrets and to set a secret's IAM policy.
3. On the service account's **Keys** tab, choose **Add key > Create new key**, select **JSON**, and download the file.
4. Enable the **Secret Manager API** on the project.
5. When you create the connector in {{kib}}, upload the JSON key file as the service account key.

The connector requests the `https://www.googleapis.com/auth/cloud-platform` OAuth scope when it exchanges the key for an access token.
