/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from 'xml2js';
import type { ActionContext } from '../../connector_spec';

/**
 * EC2 speaks the AWS *Query* protocol, not the JSON protocol used by
 * CloudWatch and X-Ray: parameters are flat `Action=...&Version=...` pairs and
 * every response is XML. See
 * https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Query-Requests.html
 *
 * Two consequences drive the shape of this module:
 *
 * 1. Lists are *flattened and 1-indexed* (`InstanceId.1`, `Filter.1.Value.1`),
 *    NOT the `.member.N` form IAM uses. Verified against the live API: sending
 *    `InstanceIds.member.1` returns `UnknownParameter`.
 * 2. SigV4 signing is handled by the aws_credentials auth interceptor, which
 *    folds `config.params` into the signed canonical query string itself. So
 *    params are passed via `params` and never hand-serialized here: a
 *    hand-rolled canonical query string is what caused a real
 *    signature-mismatch bug (kibana#282554), because `encodeURIComponent`
 *    leaves `! ' ( ) *` unescaped where SigV4 requires them encoded.
 */
const EC2_API_VERSION = '2016-11-15';

function getRegion(ctx: ActionContext): string {
  const { region } = ctx.config as { region?: string };
  if (!region) {
    throw new Error('Connector is missing the required "region" configuration field.');
  }
  return region;
}

/**
 * EC2 Query-protocol errors come back as
 * `<Response><Errors><Error><Code>..</Code><Message>..</Message></Error></Errors></Response>`,
 * which is a different envelope from both the JSON-protocol `__type` shape and
 * IAM's `<ErrorResponse>`. Pull the vendor's own code and message out so the
 * caller sees "InvalidInstanceID.NotFound: ..." instead of axios's opaque
 * "Request failed with status code 400".
 */
function readEc2ErrorXml(body: unknown): { code?: string; message?: string } | null {
  if (typeof body !== 'string' || body.length === 0) {
    return null;
  }
  const code = /<Code>([^<]*)<\/Code>/.exec(body)?.[1];
  const message = /<Message>([^<]*)<\/Message>/.exec(body)?.[1];
  if (!code && !message) {
    return null;
  }
  return { code, message };
}

export function throwWithApiError(error: unknown, action: string): never {
  const err = error as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };

  // An error already formatted by assertNotEc2ErrorEnvelope has no axios
  // `response`, so pass it through rather than wrapping its message twice.
  if (error instanceof Error && !err.response) {
    throw error;
  }

  const awsError = readEc2ErrorXml(err.response?.data);
  if (awsError) {
    throw new Error(
      `AWS EC2 ${action} failed${awsError.code ? ` (${awsError.code})` : ''}: ${
        awsError.message || 'An unknown error occurred'
      }`
    );
  }

  const status = err.response?.status;
  if (status === 401 || status === 403) {
    throw new Error(
      `AWS EC2 ${action} was denied (HTTP ${status}). Check the connector's AWS Access Key ID and Secret Access Key, and that the IAM identity is allowed to call ec2:${action}.`
    );
  }

  throw new Error(
    `AWS EC2 ${action} failed: ${err.response?.statusText || err.message || 'Unknown error'}`
  );
}

/**
 * Calls an EC2 Query-protocol action and returns the parsed XML body.
 *
 * `explicitArray: false` collapses single-element lists to a bare object, so
 * every list accessor in this connector goes through `toArray` below rather
 * than indexing blindly.
 */
export async function callEc2Api(
  ctx: ActionContext,
  action: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const region = getRegion(ctx);
  const url = `https://ec2.${region}.amazonaws.com/`;

  try {
    const response = await ctx.client.get(url, {
      params: { Action: action, Version: EC2_API_VERSION, ...params },
    });
    if (typeof response.data !== 'string') {
      return (response.data ?? {}) as Record<string, unknown>;
    }
    // An EC2 error envelope must never be parsed as a result. Normally axios
    // rejects on the accompanying 4xx, but a client configured with a lax
    // validateStatus would otherwise hand back `<Response><Errors>` and this
    // would silently read as an empty, successful list.
    assertNotEc2ErrorEnvelope(response.data, action);
    const parser = new Parser({ explicitArray: false, explicitRoot: false, ignoreAttrs: true });
    return (await parser.parseStringPromise(response.data)) as Record<string, unknown>;
  } catch (error: unknown) {
    throwWithApiError(error, action);
  }
}

/**
 * Throws when a body is an EC2 `<Response><Errors>` envelope rather than a
 * result, so a failed call can never be mistaken for an empty success.
 */
function assertNotEc2ErrorEnvelope(body: string, action: string): void {
  if (!body.includes('<Errors>')) {
    return;
  }
  const awsError = readEc2ErrorXml(body);
  if (awsError) {
    throw new Error(
      `AWS EC2 ${action} failed${awsError.code ? ` (${awsError.code})` : ''}: ${
        awsError.message || 'An unknown error occurred'
      }`
    );
  }
}

/**
 * Normalizes an xml2js `explicitArray: false` collection into a real array.
 * An EC2 `<fooSet>` is absent when empty, a single `{ item: {...} }` when it
 * holds one entry, and `{ item: [...] }` beyond that, so a workflow iterating
 * the result would otherwise silently see one character of a string, or crash.
 */
export function toArray<T = Record<string, unknown>>(collection: unknown): T[] {
  if (collection === undefined || collection === null || collection === '') {
    return [];
  }
  const items = (collection as { item?: unknown }).item ?? collection;
  if (items === undefined || items === null || items === '') {
    return [];
  }
  return (Array.isArray(items) ? items : [items]) as T[];
}

/** Reads a `<foo>true</foo>` Query-protocol boolean. */
export function readXmlBoolean(value: unknown): boolean {
  return value === 'true' || value === true;
}

/**
 * Parses an XML numeric leaf. xml2js hands back strings, so an unguarded
 * `port` field would reach a workflow as "443" rather than 443.
 */
export function readXmlNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Extracts the meaningful low byte of an instance-state code.
 *
 * AWS documents `code` as a 16-bit value whose high byte is used "for internal
 * purposes and should be ignored", so a bare `code === 16` comparison
 * intermittently misreads a running instance. Keeping only the low byte is the
 * documented way to read it (a modulo rather than a bitwise mask, since the
 * repo lints against bitwise operators). See API_InstanceState.
 */
function readInstanceStateCode(value: unknown): number | undefined {
  const parsed = readXmlNumber(value);
  return parsed === undefined ? undefined : parsed % 256;
}

/**
 * Builds the flattened, 1-indexed params EC2 uses for a list of scalars,
 * e.g. `InstanceId.1=i-abc&InstanceId.2=i-def`.
 */
export function listParams(prefix: string, values: readonly string[]): Record<string, string> {
  const params: Record<string, string> = {};
  values.forEach((value, index) => {
    params[`${prefix}.${index + 1}`] = value;
  });
  return params;
}

/** Builds `Filter.N.Name` / `Filter.N.Value.M` params. */
export function filterParams(
  filters: ReadonlyArray<{ name: string; values: readonly string[] }> | undefined
): Record<string, string> {
  const params: Record<string, string> = {};
  (filters ?? []).forEach((filter, filterIndex) => {
    params[`Filter.${filterIndex + 1}.Name`] = filter.name;
    filter.values.forEach((value, valueIndex) => {
      params[`Filter.${filterIndex + 1}.Value.${valueIndex + 1}`] = value;
    });
  });
  return params;
}

export interface IpPermissionInput {
  ipProtocol: string;
  fromPort?: number;
  toPort?: number;
  cidrIpv4?: string[];
  cidrIpv6?: string[];
  sourceSecurityGroupId?: string[];
  description?: string;
}

/**
 * Builds the nested `IpPermissions.N.*` params for the authorize/revoke
 * security-group actions. The nesting is flattened and 1-indexed at every
 * level (`IpPermissions.1.IpRanges.1.CidrIp`), verified against the live API.
 */
export function ipPermissionParams(
  permissions: readonly IpPermissionInput[]
): Record<string, string> {
  const params: Record<string, string> = {};
  permissions.forEach((permission, index) => {
    const base = `IpPermissions.${index + 1}`;
    params[`${base}.IpProtocol`] = permission.ipProtocol;
    if (permission.fromPort !== undefined) {
      params[`${base}.FromPort`] = String(permission.fromPort);
    }
    if (permission.toPort !== undefined) {
      params[`${base}.ToPort`] = String(permission.toPort);
    }
    (permission.cidrIpv4 ?? []).forEach((cidr, cidrIndex) => {
      params[`${base}.IpRanges.${cidrIndex + 1}.CidrIp`] = cidr;
      if (permission.description) {
        params[`${base}.IpRanges.${cidrIndex + 1}.Description`] = permission.description;
      }
    });
    (permission.cidrIpv6 ?? []).forEach((cidr, cidrIndex) => {
      params[`${base}.Ipv6Ranges.${cidrIndex + 1}.CidrIpv6`] = cidr;
      if (permission.description) {
        params[`${base}.Ipv6Ranges.${cidrIndex + 1}.Description`] = permission.description;
      }
    });
    (permission.sourceSecurityGroupId ?? []).forEach((groupId, groupIndex) => {
      params[`${base}.Groups.${groupIndex + 1}.GroupId`] = groupId;
      if (permission.description) {
        params[`${base}.Groups.${groupIndex + 1}.Description`] = permission.description;
      }
    });
  });
  return params;
}

/**
 * Builds `Tag.N.Key` / `Tag.N.Value` params for CreateTags and DeleteTags.
 *
 * An absent value is sent as an empty string, which is what AWS documents for
 * "tag with no value". For DeleteTags the distinction matters: a key with no
 * value deletes the tag regardless of its value, whereas an empty-string value
 * only deletes it when the value is itself empty.
 */
export function tagParams(tags: ReadonlyArray<{ key: string; value?: string }>) {
  const params: Record<string, string> = {};
  tags.forEach((tag, index) => {
    params[`Tag.${index + 1}.Key`] = tag.key;
    if (tag.value !== undefined) {
      params[`Tag.${index + 1}.Value`] = tag.value;
    }
  });
  return params;
}

interface Ec2State {
  code?: string;
  name?: string;
}

/**
 * Models a state transition honestly. Stop/start/reboot/terminate are
 * eventually consistent: StopInstances returns `stopping`, not `stopped`, so
 * reporting "the instance is stopped" here would be a lie a containment
 * playbook could act on. `settled` says whether the transition has actually
 * finished, and callers are told to poll describeInstances when it has not.
 */
export function trimStateChange(item: Record<string, unknown>) {
  const currentState = (item.currentState ?? {}) as Ec2State;
  const previousState = (item.previousState ?? {}) as Ec2State;
  const currentStateName = currentState.name;
  return {
    instanceId: item.instanceId,
    previousState: previousState.name,
    currentState: currentStateName,
    currentStateCode: readInstanceStateCode(currentState.code),
    // A transient state (pending/stopping/shutting-down) means AWS accepted the
    // request but the instance has not reached its target state yet, so a
    // workflow must poll describeInstances rather than trust this response.
    settled:
      currentStateName === 'running' ||
      currentStateName === 'stopped' ||
      currentStateName === 'terminated',
  };
}

/**
 * Trims one instance from a DescribeInstances reservation.
 *
 * DescribeInstances returns an enormous nested structure (block devices,
 * enclave/hibernation/metadata options, CPU topology, placement, licenses).
 * Only the fields a responder actually acts on are selected: identity, state,
 * addressing, and the security groups a quarantine step must target.
 *
 * User data is deliberately never surfaced: it routinely carries bootstrap
 * secrets. DescribeInstances does not return it (it needs
 * DescribeInstanceAttribute), and this connector exposes no action that reads
 * it, so it cannot leak into an agent transcript or execution record.
 */
export function trimInstance(instance: Record<string, unknown>, reservationId?: unknown) {
  const state = (instance.instanceState ?? {}) as Ec2State;
  const placement = (instance.placement ?? {}) as { availabilityZone?: string };
  return {
    instanceId: instance.instanceId,
    state: state.name,
    instanceType: instance.instanceType,
    imageId: instance.imageId,
    privateIpAddress: instance.privateIpAddress,
    publicIpAddress: instance.ipAddress,
    privateDnsName: instance.privateDnsName || undefined,
    vpcId: instance.vpcId,
    subnetId: instance.subnetId,
    availabilityZone: placement.availabilityZone,
    launchTime: instance.launchTime,
    keyName: instance.keyName,
    iamInstanceProfile: (instance.iamInstanceProfile as { arn?: string } | undefined)?.arn,
    // The groups a containment step needs in order to swap or restore them.
    securityGroups: toArray(instance.groupSet).map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
    })),
    tags: toArray(instance.tagSet).map((tag) => ({ key: tag.key, value: tag.value })),
    reservationId,
  };
}

/** Trims a security group, keeping its rules so a responder can see current exposure. */
export function trimSecurityGroup(group: Record<string, unknown>) {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    description: group.groupDescription,
    vpcId: group.vpcId,
    ownerId: group.ownerId,
    ingressRules: toArray(group.ipPermissions).map(trimIpPermission),
    egressRules: toArray(group.ipPermissionsEgress).map(trimIpPermission),
    tags: toArray(group.tagSet).map((tag) => ({ key: tag.key, value: tag.value })),
  };
}

function trimIpPermission(permission: Record<string, unknown>) {
  return {
    ipProtocol: permission.ipProtocol,
    fromPort: readXmlNumber(permission.fromPort),
    toPort: readXmlNumber(permission.toPort),
    cidrIpv4: toArray(permission.ipRanges).map((range) => range.cidrIp),
    cidrIpv6: toArray(permission.ipv6Ranges).map((range) => range.cidrIpv6),
    sourceSecurityGroups: toArray(permission.groups).map((group) => group.groupId),
  };
}

/** Trims a security-group rule as returned by DescribeSecurityGroupRules and the authorize actions. */
export function trimSecurityGroupRule(rule: Record<string, unknown>) {
  return {
    securityGroupRuleId: rule.securityGroupRuleId,
    groupId: rule.groupId,
    isEgress: readXmlBoolean(rule.isEgress),
    ipProtocol: rule.ipProtocol,
    fromPort: readXmlNumber(rule.fromPort),
    toPort: readXmlNumber(rule.toPort),
    cidrIpv4: rule.cidrIpv4,
    cidrIpv6: rule.cidrIpv6,
    referencedGroupId: (rule.referencedGroupInfo as { groupId?: string } | undefined)?.groupId,
    description: rule.description,
  };
}
