---
navigation_title: "Google Compute Engine"
type: reference
description: "Use the Google Compute Engine connector to contain a compromised VM: stop, start, or reset instances, snapshot a disk for forensics, quarantine a host with network tags, and manage isolation firewall rules."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Google Compute Engine connector [google-compute-engine-action-type]

The Google Compute Engine connector lets a workflow or agent respond to a compromised virtual machine without an analyst opening the Google Cloud console. It stops, starts, and resets instances, snapshots disks to preserve evidence, applies quarantine network tags, and creates or updates the firewall rules that make those tags isolate a host.

## Overview

This is a **custom connector** that calls the Compute Engine API (`compute.googleapis.com/compute/v1`). You upload a service account JSON key when creating the connector; every action then runs as that service account using a short-lived access token the connector mints for each request.

Two behaviours are worth understanding before you build a workflow on it:

* **Every mutating action is asynchronous.** Compute Engine returns a long-running operation, not a finished result, so a successful response means "accepted" rather than "done". Poll `getOperation` until it reports `done: true`, then check `succeeded`, before a workflow claims a VM is stopped.
* **`done` is not the same as `succeeded`.** Compute Engine reports status `DONE` for an operation that finished either successfully or with an error, so `done: true` only means the operation stopped running. Each action therefore also returns `succeeded`, which is `done` with an empty `errors` list. Branch on `succeeded`; treating `done` as success reports a failed containment action as a win.
* **Containment actions are workflow steps only**, not autonomous agent tools, because stopping or deleting an instance can take a production workload offline. Read actions are available to both agents and workflows.

## Create connectors in {{kib}} [define-google-compute-engine-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [google-compute-engine-connector-configuration]

Google Compute Engine connectors have the following configuration properties:

Service account JSON key
:   The JSON key file for the service account the connector authenticates as. Stored encrypted. Required.

Default project ID
:   Optional, for example `my-project-123`. Recorded for reference and used by the **Test connector** button, which has no other way to know which project to call. Every action takes an explicit project ID, so this value is not a fallback for them.

## Connector actions [google-compute-engine-connector-actions]

### Instances

`listInstances`
:   Lists instances with status, machine type, network tags, labels, internal and external IPs, and attached disks. Omit the zone to search every zone in the project, which is what you want when an alert names a host but not where it runs. Accepts a Compute Engine filter expression such as `status = "RUNNING"`.

`getInstance`
:   Gets one instance, including whether deletion protection is enabled and the disk names that `createSnapshot` needs.

`stopInstance`
:   Stops an instance. The core containment action that halts a running threat, reversible with `startInstance` though memory state is lost.

`startInstance`
:   Starts a stopped instance. The recovery counterpart to `stopInstance`.

`resetInstance`
:   Hard-reboots an instance, equivalent to cutting the power. This destroys memory evidence without removing the threat, so treat it as a state-reset tool rather than a containment tool.

`setInstanceTags`
:   Changes an instance's network tags, which are what firewall rules match on. Use `addTags` to apply a quarantine tag while keeping existing tags, `removeTags` to lift it, or `replaceTags` for a full overwrite. The connector reads the instance's current tag fingerprint for you.

`setInstanceLabels`
:   Sets an instance's labels, for example to record an incident ID for case tracking. Replaces the whole label map. Labels are metadata only and do not affect firewall rules.

`deleteInstance`
:   Deletes an instance permanently. Not reversible, and blocked while deletion protection is enabled.

### Disks

`createSnapshot`
:   Snapshots a disk to preserve evidence, typically the boot disk of a suspect VM. Run it before `deleteInstance`: once the disk is gone the evidence cannot be recovered.

### Firewall rules

`listFirewalls`
:   Lists the project's firewall rules with direction, priority, target tags, ranges, and the allowed or denied protocols and ports.

`getFirewall`
:   Gets one firewall rule, for verifying an isolation rule landed as intended.

`insertFirewall`
:   Creates a firewall rule. The other half of tag-based isolation: a deny-all rule scoped to a quarantine tag.

`patchFirewall`
:   Updates an existing rule during an active response: tighten ranges, flip allow to deny, change priority, or disable it.

### Operations

`getOperation`
:   Gets the status of a long-running operation, returning `done`, `succeeded`, and any `errors`. Pass the zone for instance and snapshot operations; omit it for firewall operations, which are global. Also accepts the system-generated operation names (`systemevent-`, `repair-`) that Compute Engine creates for live migrations and host repairs.

## The quarantine pattern [google-compute-engine-quarantine]

Network quarantine is usually preferable to stopping a VM, because the host stays up for live forensics while losing network reach:

1. `insertFirewall` with a deny-all rule scoped to a tag such as `quarantine`, at a **low priority number** (for example `0`) so it beats permissive existing rules.
2. `setInstanceTags` with `addTags: ["quarantine"]` on the suspect instance. Using `addTags` rather than `replaceTags` keeps the tags that existing rules already target.
3. `getOperation` with the zone to confirm the tag change completed, checking `succeeded` rather than only `done`.
4. `getInstance` to verify the tag is applied, and `getFirewall` to verify the rule is live.

To lift the quarantine, call `setInstanceTags` with `removeTags: ["quarantine"]`.

## Usage notes [google-compute-engine-usage-notes]

* Operations are **zonal** for instance, disk, and snapshot actions, and **global** for firewall actions. Passing the wrong scope to `getOperation` returns a 404.
* `setInstanceTags` with `replaceTags` and `setInstanceLabels` both replace their whole collection. For tags this silently detaches any firewall rule targeting a tag you leave out, so prefer `addTags` and `removeTags`.
* Tag and label writes carry the resource's current fingerprint, so a concurrent edit makes the write fail rather than overwrite it. Run the action again to retry.
* Instance metadata is deliberately not returned by any action, because it can contain startup scripts and secrets. The read actions request only the fields they return, so metadata and service account details are never fetched in the first place. This also keeps a project-wide `listInstances` within the connector framework's 1MB response limit, which the unfiltered Compute Engine response can exceed on a large project.

## Get API credentials [google-compute-engine-api-credentials]

To use the Google Compute Engine connector you need a Google Cloud service account and a JSON key for it:

1. In the Google Cloud console, open **IAM & Admin > Service Accounts** and either pick an existing service account or create one for the connector.
2. Grant the roles the actions you intend to use require, keeping the connector least-privileged:
   * **Compute Viewer** (`roles/compute.viewer`) for `listInstances`, `getInstance`, `listFirewalls`, `getFirewall`, and `getOperation`.
   * **Compute Instance Admin (v1)** (`roles/compute.instanceAdmin.v1`) to stop, start, reset, retag, relabel, snapshot, or delete instances.
   * **Compute Security Admin** (`roles/compute.securityAdmin`) to create or modify firewall rules.
3. On the service account's **Keys** tab, choose **Add key > Create new key**, select **JSON**, and download the file.
4. Enable the **Compute Engine API** on the project.
5. When you create the connector in {{kib}}, upload the JSON key file as the service account key and optionally set a default project ID.

The connector requests the `https://www.googleapis.com/auth/cloud-platform` OAuth scope when it exchanges the key for an access token.
