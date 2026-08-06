---
navigation_title: "Google Cloud IAM"
type: reference
description: "Use the Google Cloud IAM connector to contain a compromised cloud identity: disable service accounts, revoke leaked service account keys, and grant or revoke IAM role bindings on projects, folders, and organizations."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google Cloud IAM connector [gcp-iam-action-type]

The Google Cloud IAM connector lets a workflow or agent respond to a cloud identity incident without an analyst opening the Google Cloud console. It disables and re-enables service accounts, lists and revokes service account keys, reads IAM allow policies, and grants or revokes individual role bindings on a project, folder, or organization.

## Overview

This is a **custom connector** that calls the Google Cloud IAM API (`iam.googleapis.com`) and the Cloud Resource Manager API (`cloudresourcemanager.googleapis.com`). You upload a service account JSON key when creating the connector; every action then runs as that service account, using a short-lived access token the connector mints for each request.

Containment actions are deliberately available as workflow steps only, not as autonomous agent tools, because disabling an identity or revoking a role can take a production workload offline. Read actions are available to both.

## Create connectors in {{kib}} [define-gcp-iam-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [gcp-iam-connector-configuration]

Google Cloud IAM connectors have the following configuration properties:

Service account JSON key
:   The JSON key file for the service account the connector authenticates as. Stored encrypted. Required.

Default project ID
:   Optional. The Google Cloud project used when an action does not specify one, for example `my-project-123`. An action that passes an explicit project ID always takes precedence.

## Connector actions [gcp-iam-connector-actions]

### Service accounts

`listServiceAccounts`
:   Lists the service accounts in a project, with email, unique ID, display name, and disabled state. Paginated: keep passing the returned page token until it is absent.

`getServiceAccount`
:   Gets one service account by email. Returns its name, unique ID, display name, description, project, OAuth client ID, and disabled state. Capture the unique ID before deleting an account: it is the only handle that can restore it.

`disableServiceAccount`
:   Disables a service account so it can no longer authenticate. The primary containment move for a compromised identity, and reversible with `enableServiceAccount`. Every workload using the identity stops working immediately.

`enableServiceAccount`
:   Re-enables a disabled service account. The rollback for `disableServiceAccount`.

`createServiceAccount`
:   Creates a service account in a project, for automated onboarding or a scoped break-glass identity. The new account starts with no roles.

`deleteServiceAccount`
:   Deletes a service account. Restorable with `undeleteServiceAccount` for 30 days, but only by unique ID. Prefer `disableServiceAccount` for containment.

`undeleteServiceAccount`
:   Restores a recently deleted service account by its numeric unique ID. Only works within 30 days of deletion.

### Service account keys

`listServiceAccountKeys`
:   Lists the keys on a service account with key ID, algorithm, origin, type, validity window, and disabled state. Optionally filtered to user-managed or system-managed keys. Never returns key material.

`disableServiceAccountKey`
:   Disables one key. Cuts off a leaked credential while the account keeps working, so it contains the leak without taking down every workload. Reversible.

`enableServiceAccountKey`
:   Re-enables a disabled key.

`deleteServiceAccountKey`
:   Permanently deletes a key. Not reversible. Anything still authenticating with the key breaks immediately.

`createServiceAccountKey`
:   Creates a new key, the create half of a rotate-then-revoke rotation. For safety the connector returns only key metadata and **never the private key material**, so the secret cannot reach a workflow log or an agent transcript. Retrieve the key from Google Cloud directly.

### IAM policy

`getIamPolicy`
:   Reads the allow policy on a project, folder, or organization: every role binding with its members, any IAM conditions, and the policy etag.

`addIamPolicyBinding`
:   Grants one role to one member, leaving other bindings untouched.

`removeIamPolicyBinding`
:   Revokes one role from one member, leaving other bindings untouched. The core access-revocation response.

`setIamPolicy`
:   Replaces the entire allow policy in one call, for bulk remediation. Any binding missing from the input is revoked.

`testIamPermissions`
:   Returns which of the given permissions the caller holds on a resource. Use it to confirm a revocation took effect or to verify least privilege.

### Roles

`getRole`
:   Gets a role definition including every permission it includes, so a remediation can reason about what a binding actually grants. Works for predefined roles such as `roles/editor` and for custom roles.

`queryGrantableRoles`
:   Lists the roles that can be granted on a resource. A role that is not grantable there will be rejected when you add the binding.

## Usage notes [gcp-iam-usage-notes]

* `addIamPolicyBinding` and `removeIamPolicyBinding` read the policy, change one binding, and write it back with the policy etag. If another change lands in between, the write fails rather than overwriting it; run the action again to retry against the fresh policy.
* `setIamPolicy` replaces the whole policy. Build its bindings from a `getIamPolicy` response rather than by hand, and prefer the add and remove binding actions for a single change.
* Role names always carry their prefix, for example `roles/editor` rather than `editor`.
* Members always carry a type prefix, for example `user:someone@example.com` or `serviceAccount:my-sa@my-project.iam.gserviceaccount.com`.
* Folder policies are served by a different API version than project and organization policies. The connector selects the right one; pass the correct resource type.

## Get API credentials [gcp-iam-api-credentials]

To use the Google Cloud IAM connector you need a Google Cloud service account and a JSON key for it:

1. In the Google Cloud console, open **IAM & Admin > Service Accounts** and either pick an existing service account or create one for the connector.
2. Grant the service account the roles it needs. Granting only what the actions you intend to use require keeps the connector least-privileged:
   * **Service Account Admin** (`roles/iam.serviceAccountAdmin`) to list, get, disable, enable, create, or delete service accounts.
   * **Service Account Key Admin** (`roles/iam.serviceAccountKeyAdmin`) to list, disable, enable, create, or delete service account keys.
   * **Project IAM Admin** (`roles/resourcemanager.projectIamAdmin`) to read and change IAM policy bindings on a project. Use **Folder IAM Admin** or **Organization Administrator** for folder or organization policies.
   * **Role Viewer** (`roles/iam.roleViewer`) to read role definitions and grantable roles.
3. On the service account's **Keys** tab, choose **Add key > Create new key**, select **JSON**, and download the file.
4. Enable the **Identity and Access Management (IAM) API** and the **Cloud Resource Manager API** on the project.
5. When you create the connector in {{kib}}, upload the JSON key file as the service account key.

The connector requests the `https://www.googleapis.com/auth/cloud-platform` OAuth scope when it exchanges the key for an access token.
