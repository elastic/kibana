/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AwsEc2 } from './aws_ec2';

/**
 * The XML fixtures below are trimmed copies of real responses captured from the
 * live EC2 API, so the parsing assertions reflect the wire format rather than an
 * assumption about it. Account ids and resource ids are fictional.
 */
const DESCRIBE_INSTANCES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-1</requestId>
  <reservationSet>
    <item>
      <reservationId>r-0aaaaaaaaaaaaaaaa</reservationId>
      <ownerId>111122223333</ownerId>
      <instancesSet>
        <item>
          <instanceId>i-0aaaaaaaaaaaaaaaa</instanceId>
          <imageId>ami-0bbbbbbbbbbbbbbbb</imageId>
          <instanceState><code>16</code><name>running</name></instanceState>
          <privateDnsName>ip-10-0-0-5.ec2.internal</privateDnsName>
          <instanceType>t3.micro</instanceType>
          <launchTime>2026-08-07T00:00:00.000Z</launchTime>
          <placement><availabilityZone>us-east-1a</availabilityZone></placement>
          <subnetId>subnet-0ccccccccccccccc</subnetId>
          <vpcId>vpc-0dddddddddddddddd</vpcId>
          <privateIpAddress>10.0.0.5</privateIpAddress>
          <groupSet>
            <item><groupId>sg-0eeeeeeeeeeeeeeee</groupId><groupName>web</groupName></item>
          </groupSet>
          <tagSet>
            <item><key>Name</key><value>api-1</value></item>
          </tagSet>
        </item>
      </instancesSet>
    </item>
  </reservationSet>
</DescribeInstancesResponse>`;

const STOP_INSTANCES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<StopInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-2</requestId>
  <instancesSet>
    <item>
      <instanceId>i-0aaaaaaaaaaaaaaaa</instanceId>
      <currentState><code>64</code><name>stopping</name></currentState>
      <previousState><code>16</code><name>running</name></previousState>
    </item>
  </instancesSet>
</StopInstancesResponse>`;

const REVOKE_UNMATCHED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<RevokeSecurityGroupIngressResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-3</requestId>
  <return>true</return>
  <unknownIpPermissionSet>
    <item>
      <ipProtocol>tcp</ipProtocol>
      <fromPort>9999</fromPort>
      <toPort>9999</toPort>
      <groups/>
      <ipRanges><item><cidrIp>192.0.2.1/32</cidrIp></item></ipRanges>
      <ipv6Ranges/>
    </item>
  </unknownIpPermissionSet>
</RevokeSecurityGroupIngressResponse>`;

const REVOKE_SUCCESS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<RevokeSecurityGroupIngressResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-4</requestId>
  <return>true</return>
  <revokedSecurityGroupRuleSet>
    <item>
      <securityGroupRuleId>sgr-0aaaaaaaaaaaaaaaa</securityGroupRuleId>
      <groupId>sg-0eeeeeeeeeeeeeeee</groupId>
      <isEgress>false</isEgress>
      <ipProtocol>tcp</ipProtocol>
      <fromPort>22</fromPort>
      <toPort>22</toPort>
      <cidrIpv4>0.0.0.0/0</cidrIpv4>
    </item>
  </revokedSecurityGroupRuleSet>
</RevokeSecurityGroupIngressResponse>`;

const AUTHORIZE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<AuthorizeSecurityGroupIngressResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-5</requestId>
  <return>true</return>
  <securityGroupRuleSet>
    <item>
      <securityGroupRuleId>sgr-0bbbbbbbbbbbbbbbb</securityGroupRuleId>
      <groupId>sg-0eeeeeeeeeeeeeeee</groupId>
      <isEgress>false</isEgress>
      <ipProtocol>tcp</ipProtocol>
      <fromPort>443</fromPort>
      <toPort>443</toPort>
      <cidrIpv4>10.0.0.0/32</cidrIpv4>
      <description>responder</description>
    </item>
  </securityGroupRuleSet>
</AuthorizeSecurityGroupIngressResponse>`;

const SECURITY_GROUPS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DescribeSecurityGroupsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-6</requestId>
  <securityGroupInfo>
    <item>
      <ownerId>111122223333</ownerId>
      <groupId>sg-0eeeeeeeeeeeeeeee</groupId>
      <groupName>web</groupName>
      <groupDescription>web tier</groupDescription>
      <vpcId>vpc-0dddddddddddddddd</vpcId>
      <ipPermissions>
        <item>
          <ipProtocol>tcp</ipProtocol>
          <fromPort>443</fromPort>
          <toPort>443</toPort>
          <groups/>
          <ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges>
          <ipv6Ranges/>
        </item>
      </ipPermissions>
      <ipPermissionsEgress>
        <item>
          <ipProtocol>-1</ipProtocol>
          <groups/>
          <ipRanges><item><cidrIp>0.0.0.0/0</cidrIp></item></ipRanges>
          <ipv6Ranges/>
        </item>
      </ipPermissionsEgress>
      <tagSet/>
    </item>
  </securityGroupInfo>
</DescribeSecurityGroupsResponse>`;

const RETURN_TRUE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CreateTagsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-7</requestId>
  <return>true</return>
</CreateTagsResponse>`;

const DESCRIBE_RULES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DescribeSecurityGroupRulesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>req-8</requestId>
  <securityGroupRuleSet>
    <item>
      <securityGroupRuleId>sgr-0aaaaaaaaaaaaaaaa</securityGroupRuleId>
      <groupId>sg-0eeeeeeeeeeeeeeee</groupId>
      <isEgress>false</isEgress>
      <ipProtocol>tcp</ipProtocol>
      <fromPort>8443</fromPort>
      <toPort>8443</toPort>
      <cidrIpv4>10.0.0.0/32</cidrIpv4>
      <tagSet/>
    </item>
  </securityGroupRuleSet>
</DescribeSecurityGroupRulesResponse>`;

describe('AwsEc2', () => {
  const mockClient = { get: jest.fn() };

  // Credentials live in encrypted secrets via the aws_credentials auth type; the
  // SigV4 interceptor is installed on the axios instance by that auth type, so a
  // handler receives an already-signing client.
  const mockContext = {
    client: mockClient,
    config: { region: 'us-east-1' },
    secrets: {
      authType: 'aws_credentials',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'test-secret-access-key',
    },
    log: {},
  } as unknown as ActionContext;

  const lastCall = () => {
    const calls = mockClient.get.mock.calls;
    return calls[calls.length - 1];
  };
  const lastParams = (): Record<string, string> => lastCall()[1].params;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata and schema', () => {
    it('has the expected id, display name, and auth type', () => {
      expect(AwsEc2.metadata.id).toBe('.aws_ec2');
      expect(AwsEc2.metadata.displayName).toBe('AWS EC2');
      expect(AwsEc2.auth?.types).toEqual(['aws_credentials']);
    });

    it('declares both workflows and agentBuilder features', () => {
      expect(AwsEc2.metadata.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    });

    // ensureSufficientLicense rejects a third-party action type below gold at
    // registration time, which takes the whole Kibana server down on boot
    // rather than just disabling the connector. 'basic\' here was a real bug.
    it('requires at least a gold license, which registration enforces', () => {
      expect(AwsEc2.metadata.minimumLicense).toBe('enterprise');
    });

    it('requires only region in config, since credentials are secrets', () => {
      expect(Object.keys(AwsEc2.schema?.shape ?? {})).toEqual(['region']);
    });

    it('enables the connectivity test', () => {
      expect(AwsEc2.test?.enabled).toBe(true);
    });

    it('marks every mutating action as not agent-invokable', () => {
      const mutating = [
        'startInstance',
        'stopInstance',
        'rebootInstance',
        'terminateInstance',
        'modifyInstanceSecurityGroups',
        'authorizeSecurityGroupIngress',
        'revokeSecurityGroupIngress',
        'authorizeSecurityGroupEgress',
        'revokeSecurityGroupEgress',
        'modifySecurityGroupRules',
        'createSecurityGroup',
        'deleteSecurityGroup',
        'createTags',
        'deleteTags',
        'createSnapshot',
      ];
      for (const action of mutating) {
        expect(AwsEc2.actions[action].isTool).toBe(false);
      }
    });

    it('exposes every read action as a tool', () => {
      const reads = [
        'describeInstances',
        'describeSecurityGroups',
        'describeSecurityGroupRules',
        'describeSnapshots',
        'describeVpcs',
        'describeSubnets',
        'describeImages',
      ];
      for (const action of reads) {
        expect(AwsEc2.actions[action].isTool).toBe(true);
      }
    });
  });

  describe('Query protocol wire format', () => {
    it('sends the EC2 API version and the action name as query params', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      await AwsEc2.actions.describeInstances.handler(mockContext, {});

      const [url, options] = lastCall();
      expect(url).toBe('https://ec2.us-east-1.amazonaws.com/');
      expect(options.params.Action).toBe('DescribeInstances');
      expect(options.params.Version).toBe('2016-11-15');
    });

    it('flattens id lists as InstanceId.N, not the .member.N form IAM uses', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      await AwsEc2.actions.describeInstances.handler(mockContext, {
        instanceIds: ['i-0aaaaaaaaaaaaaaaa', 'i-0fffffffffffffff0'],
      });

      const params = lastParams();
      expect(params['InstanceId.1']).toBe('i-0aaaaaaaaaaaaaaaa');
      expect(params['InstanceId.2']).toBe('i-0fffffffffffffff0');
      // The live API rejects `InstanceIds.member.1` with UnknownParameter.
      expect(Object.keys(params).some((key) => key.includes('.member.'))).toBe(false);
      expect(Object.keys(params).some((key) => key.includes('[]'))).toBe(false);
    });

    it('builds Filter.N.Name and Filter.N.Value.M pairs', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      await AwsEc2.actions.describeInstances.handler(mockContext, {
        filters: [
          { name: 'instance-state-name', values: ['running', 'stopped'] },
          { name: 'vpc-id', values: ['vpc-0dddddddddddddddd'] },
        ],
      });

      const params = lastParams();
      expect(params['Filter.1.Name']).toBe('instance-state-name');
      expect(params['Filter.1.Value.1']).toBe('running');
      expect(params['Filter.1.Value.2']).toBe('stopped');
      expect(params['Filter.2.Name']).toBe('vpc-id');
      expect(params['Filter.2.Value.1']).toBe('vpc-0dddddddddddddddd');
    });

    it('omits MaxResults when explicit ids are given, which AWS rejects together', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      await AwsEc2.actions.describeInstances.handler(mockContext, {
        instanceIds: ['i-0aaaaaaaaaaaaaaaa'],
        maxResults: '50',
      });

      expect(lastParams().MaxResults).toBeUndefined();
    });

    it('sends MaxResults for an unscoped listing', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      await AwsEc2.actions.describeInstances.handler(mockContext, { maxResults: '50' });

      expect(lastParams().MaxResults).toBe('50');
    });

    it('passes params as an object so the SigV4 interceptor can sign them', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      await AwsEc2.actions.describeInstances.handler(mockContext, {});

      // The auth interceptor folds config.params into the signed canonical
      // query string. A handler that pre-serialized the query itself would
      // produce a signature mismatch, which AWS reports as access denied.
      const [url, options] = lastCall();
      expect(url).not.toContain('?');
      expect(typeof options.params).toBe('object');
    });
  });

  describe('describeInstances', () => {
    it('flattens instances out of the two-level reservation nesting', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      const result = (await AwsEc2.actions.describeInstances.handler(mockContext, {})) as {
        instances: Array<Record<string, unknown>>;
        count: number;
      };

      expect(result.count).toBe(1);
      expect(result.instances[0]).toMatchObject({
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
        state: 'running',
        instanceType: 't3.micro',
        privateIpAddress: '10.0.0.5',
        vpcId: 'vpc-0dddddddddddddddd',
        availabilityZone: 'us-east-1a',
        reservationId: 'r-0aaaaaaaaaaaaaaaa',
      });
      expect(result.instances[0].securityGroups).toEqual([
        { groupId: 'sg-0eeeeeeeeeeeeeeee', groupName: 'web' },
      ]);
      expect(result.instances[0].tags).toEqual([{ key: 'Name', value: 'api-1' }]);
    });

    it('never surfaces user data, which can contain bootstrap secrets', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_INSTANCES_XML });

      const result = await AwsEc2.actions.describeInstances.handler(mockContext, {});

      expect(JSON.stringify(result)).not.toMatch(/userData/i);
    });

    it('returns an empty list rather than throwing when nothing matches', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<DescribeInstancesResponse><requestId>r</requestId><reservationSet/></DescribeInstancesResponse>`,
      });

      const result = (await AwsEc2.actions.describeInstances.handler(mockContext, {})) as {
        instances: unknown[];
        count: number;
      };

      expect(result.instances).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('instance lifecycle', () => {
    it('reports stopInstance as an unsettled transition, not a stopped instance', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: STOP_INSTANCES_XML });

      const result = await AwsEc2.actions.stopInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
      });

      // The API answers "stopping": claiming the instance is stopped here would
      // be a lie a containment playbook could act on.
      expect(result).toEqual({
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
        previousState: 'running',
        currentState: 'stopping',
        currentStateCode: 64,
        settled: false,
      });
    });

    it('reports a settled transition when the instance has reached a terminal state', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<StopInstancesResponse><instancesSet><item>
            <instanceId>i-0aaaaaaaaaaaaaaaa</instanceId>
            <currentState><code>80</code><name>stopped</name></currentState>
            <previousState><code>64</code><name>stopping</name></previousState>
          </item></instancesSet></StopInstancesResponse>`,
      });

      const result = (await AwsEc2.actions.stopInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
      })) as { settled: boolean };

      expect(result.settled).toBe(true);
    });

    it('masks the high byte of a state code, which AWS documents as internal', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<StopInstancesResponse><instancesSet><item>
            <instanceId>i-0aaaaaaaaaaaaaaaa</instanceId>
            <currentState><code>4112</code><name>running</name></currentState>
            <previousState><code>0</code><name>pending</name></previousState>
          </item></instancesSet></StopInstancesResponse>`,
      });

      const result = (await AwsEc2.actions.stopInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
      })) as { currentStateCode: number };

      // 4112 = 0x1010: the 0x10 high byte is AWS-internal, and the low byte
      // 0x10 = 16 is the real "running" code.
      expect(result.currentStateCode).toBe(16);
    });

    it('forwards the force and hibernate modifiers only when set', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: STOP_INSTANCES_XML });

      await AwsEc2.actions.stopInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
      });
      expect(lastParams().Force).toBeUndefined();
      expect(lastParams().Hibernate).toBeUndefined();

      await AwsEc2.actions.stopInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
        force: true,
      });
      expect(lastParams().Force).toBe('true');
    });

    it('never claims a reboot completed, since AWS only queues it', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<RebootInstancesResponse><requestId>r</requestId><return>true</return></RebootInstancesResponse>`,
      });

      const result = (await AwsEc2.actions.rebootInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
      })) as { accepted: boolean; settled: boolean };

      expect(result.accepted).toBe(true);
      expect(result.settled).toBe(false);
    });

    it('calls the right action for start and terminate', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: STOP_INSTANCES_XML });

      await AwsEc2.actions.startInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
      });
      expect(lastParams().Action).toBe('StartInstances');

      await AwsEc2.actions.terminateInstance.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
      });
      expect(lastParams().Action).toBe('TerminateInstances');
    });
  });

  describe('modifyInstanceSecurityGroups', () => {
    it('returns the previous groups so a quarantine can be reversed', async () => {
      mockClient.get
        .mockResolvedValueOnce({ status: 200, data: DESCRIBE_INSTANCES_XML })
        .mockResolvedValueOnce({
          status: 200,
          data: `<ModifyInstanceAttributeResponse><return>true</return></ModifyInstanceAttributeResponse>`,
        });

      const result = await AwsEc2.actions.modifyInstanceSecurityGroups.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
        groupIds: ['sg-0999999999999999a'],
      });

      expect(result).toEqual({
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
        changed: true,
        securityGroupIds: ['sg-0999999999999999a'],
        previousSecurityGroupIds: ['sg-0eeeeeeeeeeeeeeee'],
      });
      const params = lastParams();
      expect(params.Action).toBe('ModifyInstanceAttribute');
      expect(params.InstanceId).toBe('i-0aaaaaaaaaaaaaaaa');
      expect(params['GroupId.1']).toBe('sg-0999999999999999a');
      // The typed GroupId.N form is used without an Attribute param, matching
      // every documented AWS example.
      expect(params.Attribute).toBeUndefined();
    });

    it('reports a no-op distinctly instead of faking successful containment', async () => {
      mockClient.get.mockResolvedValueOnce({ status: 200, data: DESCRIBE_INSTANCES_XML });

      const result = (await AwsEc2.actions.modifyInstanceSecurityGroups.handler(mockContext, {
        instanceId: 'i-0aaaaaaaaaaaaaaaa',
        groupIds: ['sg-0eeeeeeeeeeeeeeee'],
      })) as { changed: boolean; reason: string };

      expect(result.changed).toBe(false);
      expect(result.reason).toContain('already attached');
      // Only the describe ran; no mutation was attempted.
      expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    it("throws a clear error when the instance is not in this connector's region", async () => {
      mockClient.get.mockResolvedValueOnce({
        status: 200,
        data: `<DescribeInstancesResponse><reservationSet/></DescribeInstancesResponse>`,
      });

      await expect(
        AwsEc2.actions.modifyInstanceSecurityGroups.handler(mockContext, {
          instanceId: 'i-0aaaaaaaaaaaaaaaa',
          groupIds: ['sg-0999999999999999a'],
        })
      ).rejects.toThrow(/region/);
    });
  });

  describe('security group rules', () => {
    it('builds the nested IpPermissions.N form EC2 requires', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: AUTHORIZE_XML });

      await AwsEc2.actions.authorizeSecurityGroupIngress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [
          {
            ipProtocol: 'tcp',
            fromPort: 443,
            toPort: 443,
            cidrIpv4: ['10.0.0.0/32'],
            description: 'responder',
          },
        ],
      });

      const params = lastParams();
      expect(params.GroupId).toBe('sg-0eeeeeeeeeeeeeeee');
      expect(params['IpPermissions.1.IpProtocol']).toBe('tcp');
      expect(params['IpPermissions.1.FromPort']).toBe('443');
      expect(params['IpPermissions.1.ToPort']).toBe('443');
      expect(params['IpPermissions.1.IpRanges.1.CidrIp']).toBe('10.0.0.0/32');
      expect(params['IpPermissions.1.IpRanges.1.Description']).toBe('responder');
      // Not IpRanges.member.1, which the live API rejects.
      expect(Object.keys(params).some((key) => key.includes('.member.'))).toBe(false);
    });

    it('uses Groups.N for a source security group, not UserIdGroupPairs', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: AUTHORIZE_XML });

      await AwsEc2.actions.authorizeSecurityGroupIngress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [
          {
            ipProtocol: 'tcp',
            fromPort: 80,
            toPort: 80,
            sourceSecurityGroupIds: ['sg-0abc123456'],
          },
        ],
      });

      const params = lastParams();
      expect(params['IpPermissions.1.Groups.1.GroupId']).toBe('sg-0abc123456');
      expect(Object.keys(params).some((key) => key.includes('UserIdGroupPairs'))).toBe(false);
    });

    it('builds Ipv6Ranges.N.CidrIpv6 for an IPv6 rule', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: AUTHORIZE_XML });

      await AwsEc2.actions.authorizeSecurityGroupIngress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [
          { ipProtocol: 'tcp', fromPort: 22, toPort: 22, cidrIpv6: ['2001:db8::/32'] },
        ],
      });

      expect(lastParams()['IpPermissions.1.Ipv6Ranges.1.CidrIpv6']).toBe('2001:db8::/32');
    });

    it('returns the new rule ids from an authorize, as the undo handle', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: AUTHORIZE_XML });

      const result = (await AwsEc2.actions.authorizeSecurityGroupIngress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [
          { ipProtocol: 'tcp', fromPort: 443, toPort: 443, cidrIpv4: ['10.0.0.0/32'] },
        ],
      })) as { changed: boolean; rules: Array<Record<string, unknown>> };

      expect(result.changed).toBe(true);
      expect(result.rules[0]).toMatchObject({
        securityGroupRuleId: 'sgr-0bbbbbbbbbbbbbbbb',
        ipProtocol: 'tcp',
        fromPort: 443,
        toPort: 443,
        isEgress: false,
      });
    });

    it('reports changed: false when a revoke matched no existing rule', async () => {
      // AWS answers HTTP 200 with return=true even though nothing was removed,
      // so a naive handler would report successful containment.
      mockClient.get.mockResolvedValue({ status: 200, data: REVOKE_UNMATCHED_XML });

      const result = (await AwsEc2.actions.revokeSecurityGroupIngress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [
          { ipProtocol: 'tcp', fromPort: 9999, toPort: 9999, cidrIpv4: ['192.0.2.1/32'] },
        ],
      })) as {
        changed: boolean;
        reason: string;
        unmatchedRules: Array<Record<string, unknown>>;
      };

      expect(result.changed).toBe(false);
      expect(result.reason).toContain('no access was removed');
      // Ports are numbers here, matching every other action's shape. xml2js
      // hands back strings, so an unparsed passthrough would give a workflow
      // "9999" from this action and 9999 from describeSecurityGroupRules.
      expect(result.unmatchedRules[0]).toMatchObject({
        ipProtocol: 'tcp',
        fromPort: 9999,
        toPort: 9999,
        cidrIpv4: ['192.0.2.1/32'],
      });
    });

    it('reports changed: true with the revoked rules on a real revoke', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: REVOKE_SUCCESS_XML });

      const result = (await AwsEc2.actions.revokeSecurityGroupIngress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [{ ipProtocol: 'tcp', fromPort: 22, toPort: 22, cidrIpv4: ['0.0.0.0/0'] }],
      })) as { changed: boolean; revokedRules: Array<Record<string, unknown>> };

      expect(result.changed).toBe(true);
      expect(result.revokedRules[0].securityGroupRuleId).toBe('sgr-0aaaaaaaaaaaaaaaa');
    });

    it('routes egress actions to the egress APIs', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: REVOKE_SUCCESS_XML });

      await AwsEc2.actions.revokeSecurityGroupEgress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [{ ipProtocol: '-1', cidrIpv4: ['0.0.0.0/0'] }],
      });
      expect(lastParams().Action).toBe('RevokeSecurityGroupEgress');

      mockClient.get.mockResolvedValue({ status: 200, data: AUTHORIZE_XML });
      await AwsEc2.actions.authorizeSecurityGroupEgress.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [{ ipProtocol: '-1', cidrIpv4: ['0.0.0.0/0'] }],
      });
      expect(lastParams().Action).toBe('AuthorizeSecurityGroupEgress');
    });

    it('reads a modified rule back, since the API returns no detail', async () => {
      mockClient.get
        .mockResolvedValueOnce({
          status: 200,
          data: `<ModifySecurityGroupRulesResponse><return>true</return></ModifySecurityGroupRulesResponse>`,
        })
        .mockResolvedValueOnce({ status: 200, data: DESCRIBE_RULES_XML });

      const result = (await AwsEc2.actions.modifySecurityGroupRules.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        securityGroupRuleId: 'sgr-0aaaaaaaaaaaaaaaa',
        ipProtocol: 'tcp',
        fromPort: 8443,
        toPort: 8443,
        cidrIpv4: '10.0.0.0/32',
      })) as { changed: boolean; rule: Record<string, unknown> };

      const [, modifyOptions] = mockClient.get.mock.calls[0];
      expect(modifyOptions.params['SecurityGroupRule.1.SecurityGroupRuleId']).toBe(
        'sgr-0aaaaaaaaaaaaaaaa'
      );
      expect(modifyOptions.params['SecurityGroupRule.1.SecurityGroupRule.FromPort']).toBe('8443');
      expect(result.changed).toBe(true);
      expect(result.rule).toMatchObject({ fromPort: 8443, toPort: 8443 });
    });
  });

  describe('describeSecurityGroups', () => {
    it('returns ingress and egress rules with numeric ports', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: SECURITY_GROUPS_XML });

      const result = (await AwsEc2.actions.describeSecurityGroups.handler(mockContext, {})) as {
        securityGroups: Array<Record<string, unknown>>;
      };

      const group = result.securityGroups[0];
      expect(group).toMatchObject({ groupId: 'sg-0eeeeeeeeeeeeeeee', groupName: 'web' });
      expect(group.ingressRules).toEqual([
        {
          ipProtocol: 'tcp',
          fromPort: 443,
          toPort: 443,
          cidrIpv4: ['0.0.0.0/0'],
          cidrIpv6: [],
          sourceSecurityGroups: [],
        },
      ]);
      expect((group.egressRules as Array<Record<string, unknown>>)[0].ipProtocol).toBe('-1');
    });

    it('scopes rule listing by group id through a filter, since the API has no GroupId param', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: DESCRIBE_RULES_XML });

      await AwsEc2.actions.describeSecurityGroupRules.handler(mockContext, {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
      });

      const params = lastParams();
      expect(params['Filter.1.Name']).toBe('group-id');
      expect(params['Filter.1.Value.1']).toBe('sg-0eeeeeeeeeeeeeeee');
      expect(params.GroupId).toBeUndefined();
    });
  });

  describe('tags', () => {
    it('builds ResourceId.N and Tag.N.Key/Value params', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: RETURN_TRUE_XML });

      await AwsEc2.actions.createTags.handler(mockContext, {
        resourceIds: ['i-0aaaaaaaaaaaaaaaa'],
        tags: [{ key: 'IncidentStatus', value: 'quarantined' }],
      });

      const params = lastParams();
      expect(params['ResourceId.1']).toBe('i-0aaaaaaaaaaaaaaaa');
      expect(params['Tag.1.Key']).toBe('IncidentStatus');
      expect(params['Tag.1.Value']).toBe('quarantined');
    });

    it('omits a tag value on delete so the key is removed whatever its value', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: RETURN_TRUE_XML });

      await AwsEc2.actions.deleteTags.handler(mockContext, {
        resourceIds: ['i-0aaaaaaaaaaaaaaaa'],
        tags: [{ key: 'IncidentStatus' }],
      });

      const params = lastParams();
      expect(params['Tag.1.Key']).toBe('IncidentStatus');
      expect(params['Tag.1.Value']).toBeUndefined();
    });

    it('always sends a tag list on delete, since AWS wipes all tags without one', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: RETURN_TRUE_XML });

      await AwsEc2.actions.deleteTags.handler(mockContext, {
        resourceIds: ['i-0aaaaaaaaaaaaaaaa'],
        tags: [{ key: 'a' }],
      });

      expect(Object.keys(lastParams()).some((key) => key.startsWith('Tag.'))).toBe(true);
    });
  });

  describe('unscoped-enumeration defaults', () => {
    it('defaults snapshots to self-owned, avoiding the public catalogue', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<DescribeSnapshotsResponse><snapshotSet/></DescribeSnapshotsResponse>`,
      });

      await AwsEc2.actions.describeSnapshots.handler(mockContext, {});

      expect(lastParams()['Owner.1']).toBe('self');
    });

    it('defaults images to self-owned, avoiding every public AMI', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<DescribeImagesResponse><imagesSet/></DescribeImagesResponse>`,
      });

      await AwsEc2.actions.describeImages.handler(mockContext, {});

      expect(lastParams()['Owner.1']).toBe('self');
    });

    it('does not force an owner when explicit ids are requested', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<DescribeSnapshotsResponse><snapshotSet/></DescribeSnapshotsResponse>`,
      });

      await AwsEc2.actions.describeSnapshots.handler(mockContext, {
        snapshotIds: ['snap-0aaaaaaaaaaaaaaaa'],
      });

      expect(lastParams()['Owner.1']).toBeUndefined();
    });
  });

  describe('createSecurityGroup and createSnapshot', () => {
    it('builds the nested TagSpecification form with the right resource type', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<CreateSecurityGroupResponse><return>true</return><groupId>sg-0new000000000000</groupId></CreateSecurityGroupResponse>`,
      });

      const result = (await AwsEc2.actions.createSecurityGroup.handler(mockContext, {
        groupName: 'incident-isolation',
        description: 'Quarantine group',
        vpcId: 'vpc-0dddddddddddddddd',
        tags: [{ key: 'Incident', value: '1234' }],
      })) as { groupId: unknown };

      const params = lastParams();
      expect(params.GroupName).toBe('incident-isolation');
      expect(params.GroupDescription).toBe('Quarantine group');
      expect(params['TagSpecification.1.ResourceType']).toBe('security-group');
      expect(params['TagSpecification.1.Tag.1.Key']).toBe('Incident');
      expect(result.groupId).toBe('sg-0new000000000000');
    });

    it('reports a pending snapshot as unsettled', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<CreateSnapshotResponse><snapshotId>snap-0aaaaaaaaaaaaaaaa</snapshotId>
          <volumeId>vol-0aaaaaaaaaaaaaaaa</volumeId><status>pending</status>
          <progress>0%</progress></CreateSnapshotResponse>`,
      });

      const result = (await AwsEc2.actions.createSnapshot.handler(mockContext, {
        volumeId: 'vol-0aaaaaaaaaaaaaaaa',
      })) as { status: unknown; settled: boolean };

      expect(result.status).toBe('pending');
      expect(result.settled).toBe(false);
    });
  });

  describe('error handling', () => {
    it('surfaces the AWS error code and message from the Query error envelope', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 400,
          data: `<Response><Errors><Error><Code>InvalidInstanceID.NotFound</Code><Message>The instance ID 'i-0aaaaaaaaaaaaaaaa\' does not exist</Message></Error></Errors></Response>`,
        },
      });

      await expect(
        AwsEc2.actions.stopInstance.handler(mockContext, { instanceId: 'i-0aaaaaaaaaaaaaaaa' })
      ).rejects.toThrow(/InvalidInstanceID\.NotFound.*does not exist/);
    });

    it('never reads an error envelope as an empty successful result', async () => {
      // A client with a lax validateStatus can deliver an EC2 error body on a
      // 200. Parsing it as a result would report "no instances found" for what
      // was actually a failed call.
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<Response><Errors><Error><Code>InvalidInstanceID.Malformed</Code><Message>Invalid id: "i-00000000000000000"</Message></Error></Errors></Response>`,
      });

      await expect(
        AwsEc2.actions.describeInstances.handler(mockContext, {
          instanceIds: ['i-00000000000000000'],
        })
      ).rejects.toThrow(/InvalidInstanceID\.Malformed/);
    });

    it('gives an actionable message for an auth failure', async () => {
      mockClient.get.mockRejectedValue({ response: { status: 403, data: '' } });

      await expect(AwsEc2.actions.describeInstances.handler(mockContext, {})).rejects.toThrow(
        /Access Key ID/
      );
    });

    it('names the failing action in a generic transport error', async () => {
      mockClient.get.mockRejectedValue({ message: 'socket hang up' });

      await expect(AwsEc2.actions.describeInstances.handler(mockContext, {})).rejects.toThrow(
        /DescribeInstances failed: socket hang up/
      );
    });

    it('throws when the region config is missing', async () => {
      const noRegion = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(AwsEc2.actions.describeInstances.handler(noRegion, {})).rejects.toThrow(
        /region/
      );
    });
  });

  describe('input validation', () => {
    it('rejects a malformed instance id', () => {
      const schema = AwsEc2.actions.stopInstance.input;
      expect(schema?.safeParse({ instanceId: 'not-an-instance' }).success).toBe(false);
      expect(schema?.safeParse({ instanceId: 'i-0aaaaaaaaaaaaaaaa' }).success).toBe(true);
    });

    it('rejects a rule with no source or destination', () => {
      const schema = AwsEc2.actions.revokeSecurityGroupIngress.input;
      const result = schema?.safeParse({
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [{ ipProtocol: 'tcp', fromPort: 22, toPort: 22 }],
      });
      expect(result?.success).toBe(false);
    });

    it('requires ports for a tcp rule', () => {
      const schema = AwsEc2.actions.authorizeSecurityGroupIngress.input;
      const result = schema?.safeParse({
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [{ ipProtocol: 'tcp', cidrIpv4: ['0.0.0.0/0'] }],
      });
      expect(result?.success).toBe(false);
    });

    it('allows an all-protocols rule without ports', () => {
      const schema = AwsEc2.actions.revokeSecurityGroupEgress.input;
      const result = schema?.safeParse({
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        ipPermissions: [{ ipProtocol: '-1', cidrIpv4: ['0.0.0.0/0'] }],
      });
      expect(result?.success).toBe(true);
    });

    it("requires at least one group id when replacing an instance's groups", () => {
      const schema = AwsEc2.actions.modifyInstanceSecurityGroups.input;
      expect(schema?.safeParse({ instanceId: 'i-0aaaaaaaaaaaaaaaa', groupIds: [] }).success).toBe(
        false
      );
    });

    it('requires exactly one source type when modifying a rule', () => {
      const schema = AwsEc2.actions.modifySecurityGroupRules.input;
      const base = {
        groupId: 'sg-0eeeeeeeeeeeeeeee',
        securityGroupRuleId: 'sgr-0aaaaaaaaaaaaaaaa',
        ipProtocol: 'tcp' as const,
        fromPort: 22,
        toPort: 22,
      };
      expect(schema?.safeParse(base).success).toBe(false);
      expect(schema?.safeParse({ ...base, cidrIpv4: '10.0.0.0/8' }).success).toBe(true);
      expect(
        schema?.safeParse({ ...base, cidrIpv4: '10.0.0.0/8', cidrIpv6: '2001:db8::/32' }).success
      ).toBe(false);
    });

    it('rejects a group name that looks like a group id', () => {
      const schema = AwsEc2.actions.createSecurityGroup.input;
      expect(schema?.safeParse({ groupName: 'sg-0abc', description: 'x' }).success).toBe(false);
    });

    it('requires a tag list when deleting tags', () => {
      const schema = AwsEc2.actions.deleteTags.input;
      expect(schema?.safeParse({ resourceIds: ['i-0aaaaaaaaaaaaaaaa'], tags: [] }).success).toBe(
        false
      );
    });
  });

  describe('test handler', () => {
    it('verifies connectivity with DescribeRegions', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: `<DescribeRegionsResponse><regionInfo><item><regionName>us-east-1</regionName></item></regionInfo></DescribeRegionsResponse>`,
      });

      const result = (await AwsEc2.test?.handler?.(mockContext)) as {
        message: string;
      };

      expect(lastParams().Action).toBe('DescribeRegions');
      expect(result.message).toContain('us-east-1');
      // ConnectorTestHandlerResult forbids an `ok` field.
      expect(result).not.toHaveProperty('ok');
    });

    it('throws when the credentials are rejected', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 401,
          data: `<Response><Errors><Error><Code>AuthFailure</Code><Message>AWS was not able to validate the provided access credentials</Message></Error></Errors></Response>`,
        },
      });

      await expect(AwsEc2.test?.handler?.(mockContext)).rejects.toThrow(/AuthFailure/);
    });
  });
});
