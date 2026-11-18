/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { AwsSsmConnector } from './aws_ssm';

describe('AwsSsmConnector', () => {
  const mockClient = { post: jest.fn() };
  const mockContext = {
    client: mockClient,
    config: { region: 'us-east-1' },
    log: {},
  } as unknown as ActionContext;
  const { describeInstanceInformation } = AwsSsmConnector.actions;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.post.mockResolvedValue({ data: {} });
  });

  const parametersWithKeys = (count: number) =>
    Object.fromEntries(Array.from({ length: count }, (_, index) => [`p${index}`, ['value']]));

  it.each([
    [
      'describeInstanceInformation tags combined with another filter',
      'describeInstanceInformation',
      { tags: [{ key: 'Env', values: ['prod'] }] },
      { tags: [{ key: 'Env', values: ['prod'] }], pingStatus: ['Online'] },
    ],
    [
      'sendCommand with more than 50 parameters',
      'sendCommand',
      {
        instanceIds: ['i-1234567890abcdef0'],
        documentName: 'AWS-RunShellScript',
        parameters: parametersWithKeys(50),
      },
      {
        instanceIds: ['i-1234567890abcdef0'],
        documentName: 'AWS-RunShellScript',
        parameters: parametersWithKeys(51),
      },
    ],
    [
      'startAutomationExecution with no parameters',
      'startAutomationExecution',
      { documentName: 'AWS-RestartEC2Instance', parameters: parametersWithKeys(1) },
      { documentName: 'AWS-RestartEC2Instance', parameters: {} },
    ],
    [
      'startAutomationExecution with more than 200 parameters',
      'startAutomationExecution',
      { documentName: 'AWS-RestartEC2Instance', parameters: parametersWithKeys(200) },
      { documentName: 'AWS-RestartEC2Instance', parameters: parametersWithKeys(201) },
    ],
    [
      'putParameter of a SecureString',
      'putParameter',
      { name: '/myapp/flag', value: 'on', type: 'String' },
      { name: '/myapp/flag', value: 'on', type: 'SecureString' },
    ],
  ])('rejects %s', (_case, action, validInput, invalidInput) => {
    const { input } = AwsSsmConnector.actions[action];

    expect(input.safeParse(validInput).success).toBe(true);
    expect(input.safeParse(invalidInput).success).toBe(false);
  });

  it.each([
    ['us-east-1', true],
    ['us-gov-west-1', true],
    ['cn-north-1', false],
    ['us-iso-east-1', false],
  ])('accepts only Regions served from amazonaws.com: %s -> %s', (region, accepted) => {
    expect(AwsSsmConnector.schema?.safeParse({ region }).success).toBe(accepted);
  });

  it.each([
    [
      'cancelCommand',
      'CancelCommand',
      {
        commandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
        instanceIds: ['i-1234567890abcdef0'],
      },
      { CommandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab', InstanceIds: ['i-1234567890abcdef0'] },
    ],
    [
      'stopAutomationExecution',
      'StopAutomationExecution',
      { automationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab' },
      { AutomationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab' },
    ],
  ])('%s sends %s with its target', async (action, operation, params, body) => {
    const result = await AwsSsmConnector.actions[action].handler(mockContext, params);

    expect(mockClient.post).toHaveBeenCalledWith(
      'https://ssm.us-east-1.amazonaws.com/',
      JSON.stringify(body),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Amz-Target': `AmazonSSM.${operation}` }),
      })
    );
    expect(result).toEqual({ success: true });
  });

  describe('describeInstanceInformation', () => {
    it('sends each filter under the key SSM expects', async () => {
      await describeInstanceInformation.handler(mockContext, {
        instanceIds: ['i-1234567890abcdef0'],
        pingStatus: ['Online'],
        platformType: ['Linux'],
        maxResults: 10,
      });
      await describeInstanceInformation.handler(mockContext, {
        tags: [{ key: 'Env', values: ['prod'] }],
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        Filters: [
          { Key: 'InstanceIds', Values: ['i-1234567890abcdef0'] },
          { Key: 'PingStatus', Values: ['Online'] },
          { Key: 'PlatformTypes', Values: ['Linux'] },
        ],
        MaxResults: 10,
      });
      expect(JSON.parse(mockClient.post.mock.calls[1][1])).toEqual({
        Filters: [{ Key: 'tag:Env', Values: ['prod'] }],
      });
    });

    it('accepts the null nextToken of a last page, and does not send it', async () => {
      const input = describeInstanceInformation.input.parse({ nextToken: null });

      await describeInstanceInformation.handler(mockContext, input);

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({});
    });

    it('returns ISO ping dates, and no nextToken on the last page', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          InstanceInformationList: [
            { InstanceId: 'i-1234567890abcdef0', LastPingDateTime: 1700000000.5 },
          ],
          NextToken: '',
        },
      });

      await expect(describeInstanceInformation.handler(mockContext, {})).resolves.toEqual({
        instances: [
          expect.objectContaining({
            instanceId: 'i-1234567890abcdef0',
            lastPingDateTime: '2023-11-14T22:13:20.500Z',
          }),
        ],
        nextToken: null,
      });
    });
  });

  describe('sendCommand', () => {
    it('sends the document and its parameters to the nodes, and returns the command ID', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          Command: {
            CommandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
            DocumentName: 'AWS-RunShellScript',
            InstanceIds: ['i-1234567890abcdef0'],
            RequestedDateTime: 1700000000.5,
            Status: 'Pending',
          },
        },
      });

      const result = await AwsSsmConnector.actions.sendCommand.handler(mockContext, {
        instanceIds: ['i-1234567890abcdef0'],
        documentName: 'AWS-RunShellScript',
        parameters: { commands: ['uptime'] },
        timeoutSeconds: 60,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://ssm.us-east-1.amazonaws.com/',
        JSON.stringify({
          InstanceIds: ['i-1234567890abcdef0'],
          DocumentName: 'AWS-RunShellScript',
          Parameters: { commands: ['uptime'] },
          TimeoutSeconds: 60,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Amz-Target': 'AmazonSSM.SendCommand' }),
        })
      );
      expect(result).toEqual({
        commandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
        documentName: 'AWS-RunShellScript',
        instanceIds: ['i-1234567890abcdef0'],
        status: 'Pending',
        requestedDateTime: '2023-11-14T22:13:20.500Z',
      });
    });
  });

  describe('getCommandInvocation', () => {
    it('returns the output, and no end time while the command runs', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          CommandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
          InstanceId: 'i-1234567890abcdef0',
          Status: 'InProgress',
          ResponseCode: -1,
          ExecutionStartDateTime: '2023-11-14T22:13:21.181Z',
          ExecutionEndDateTime: '',
          StandardOutputContent: ' 22:13:21 up 3 days',
          StandardErrorContent: '',
        },
      });

      const result = await AwsSsmConnector.actions.getCommandInvocation.handler(mockContext, {
        commandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
        instanceId: 'i-1234567890abcdef0',
        pluginName: 'runShellScript',
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        CommandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
        InstanceId: 'i-1234567890abcdef0',
        PluginName: 'runShellScript',
      });
      expect(result).toMatchObject({
        status: 'InProgress',
        responseCode: -1,
        executionStartDateTime: '2023-11-14T22:13:21.181Z',
        executionEndDateTime: null,
        standardOutput: ' 22:13:21 up 3 days',
      });
    });

    it.each([
      ['Success', true],
      ['Failed', true],
      ['TimedOut', true],
      ['Cancelled', true],
      ['Pending', false],
      ['InProgress', false],
      ['Delayed', false],
      ['Cancelling', false],
    ])('reports status %s as finished: %s', async (Status, isFinished) => {
      mockClient.post.mockResolvedValue({ data: { Status } });

      const result = await AwsSsmConnector.actions.getCommandInvocation.handler(mockContext, {
        commandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
        instanceId: 'i-1234567890abcdef0',
      });

      expect(result).toMatchObject({ isFinished });
    });
  });

  describe('listDocuments', () => {
    it('sends each filter under the key SSM expects', async () => {
      await AwsSsmConnector.actions.listDocuments.handler(mockContext, {
        documentType: 'Automation',
        owner: 'Amazon',
        namePrefix: 'AWS-Restart',
        platformType: 'Linux',
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        Filters: [
          { Key: 'DocumentType', Values: ['Automation'] },
          { Key: 'Owner', Values: ['Amazon'] },
          { Key: 'Name', Values: ['AWS-Restart'] },
          { Key: 'PlatformTypes', Values: ['Linux'] },
        ],
      });
    });
  });

  describe('getDocument', () => {
    it('asks for the document as YAML', async () => {
      await AwsSsmConnector.actions.getDocument.handler(mockContext, {
        name: 'AWS-RestartEC2Instance',
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        Name: 'AWS-RestartEC2Instance',
        DocumentFormat: 'YAML',
      });
    });
  });

  describe('listCommands', () => {
    it('sends lowercase key/value filters, and returns the parameters each command ran with', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          Commands: [
            {
              CommandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
              Parameters: { commands: ['uptime'] },
              RequestedDateTime: 1700000000.5,
            },
          ],
        },
      });

      const result = await AwsSsmConnector.actions.listCommands.handler(mockContext, {
        instanceId: 'i-1234567890abcdef0',
        status: 'Failed',
        invokedAfter: '2026-11-01T00:00:00Z',
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        InstanceId: 'i-1234567890abcdef0',
        Filters: [
          { key: 'Status', value: 'Failed' },
          { key: 'InvokedAfter', value: '2026-11-01T00:00:00Z' },
        ],
      });
      expect(result).toEqual({
        commands: [
          expect.objectContaining({
            commandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
            parameters: { commands: ['uptime'] },
            requestedDateTime: '2023-11-14T22:13:20.500Z',
          }),
        ],
        nextToken: null,
      });
    });
  });

  describe('getParameter', () => {
    it('never asks for decryption, and hides the value of a SecureString only', async () => {
      mockClient.post
        .mockResolvedValueOnce({
          data: {
            Parameter: {
              Name: '/myapp/prod/db-password',
              Type: 'SecureString',
              Value: 'AQICAHh...',
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            Parameter: { Name: '/myapp/prod/db-host', Type: 'String', Value: 'db.internal' },
          },
        });
      const { handler } = AwsSsmConnector.actions.getParameter;

      const secret = await handler(mockContext, { name: '/myapp/prod/db-password' });
      const plain = await handler(mockContext, { name: '/myapp/prod/db-host' });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        Name: '/myapp/prod/db-password',
        WithDecryption: false,
      });
      expect(secret).toMatchObject({ type: 'SecureString', value: null });
      expect(plain).toMatchObject({ type: 'String', value: 'db.internal' });
    });
  });

  describe('putParameter', () => {
    it('overwrites a parameter that does not exist yet, sending the type and overwrite flag', async () => {
      mockClient.post
        .mockRejectedValueOnce(
          new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, {}, {
            status: 400,
            headers: {},
            data: { __type: 'ParameterNotFound' },
          } as AxiosResponse)
        )
        .mockResolvedValueOnce({ data: { Version: 4, Tier: 'Standard' } });

      const result = await AwsSsmConnector.actions.putParameter.handler(mockContext, {
        name: '/myapp/prod/hosts',
        value: 'a.example.com,b.example.com',
        type: 'StringList',
        overwrite: true,
      });

      expect(JSON.parse(mockClient.post.mock.calls[1][1])).toEqual({
        Name: '/myapp/prod/hosts',
        Value: 'a.example.com,b.example.com',
        Type: 'StringList',
        Overwrite: true,
      });
      expect(result).toEqual({ name: '/myapp/prod/hosts', version: 4, tier: 'Standard' });
    });

    it('refuses to overwrite a SecureString', async () => {
      mockClient.post.mockResolvedValue({ data: { Parameter: { Type: 'SecureString' } } });

      await expect(
        AwsSsmConnector.actions.putParameter.handler(mockContext, {
          name: '/myapp/prod/db-password',
          value: 'plain',
          type: 'String',
          overwrite: true,
        })
      ).rejects.toThrow('/myapp/prod/db-password is a SecureString parameter');
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('startAutomationExecution', () => {
    it('starts the runbook with its parameters, and returns the execution ID', async () => {
      mockClient.post.mockResolvedValue({
        data: { AutomationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab' },
      });

      const result = await AwsSsmConnector.actions.startAutomationExecution.handler(mockContext, {
        documentName: 'AWS-RestartEC2Instance',
        parameters: { InstanceId: ['i-1234567890abcdef0'] },
        clientToken: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        DocumentName: 'AWS-RestartEC2Instance',
        Parameters: { InstanceId: ['i-1234567890abcdef0'] },
        ClientToken: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
      });
      expect(result).toEqual({ automationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab' });
    });
  });

  describe('getAutomationExecution', () => {
    it('returns the status and each step with its failure details, with no end time while it runs', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          AutomationExecution: {
            AutomationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab',
            AutomationExecutionStatus: 'InProgress',
            CurrentStepName: 'startInstances',
            ExecutionStartTime: 1700000000.5,
            StepExecutions: [
              {
                StepName: 'stopInstances',
                Action: 'aws:changeInstanceState',
                StepStatus: 'Success',
                ExecutionStartTime: 1700000000.5,
                ExecutionEndTime: 1700000060,
                Outputs: { InstanceStates: ['stopped'] },
              },
              {
                StepName: 'startInstances',
                StepStatus: 'Failed',
                FailureDetails: {
                  FailureStage: 'InputValidation',
                  FailureType: 'Permission',
                  Details: { VerificationErrorMessage: ['The session credentials have expired'] },
                },
              },
            ],
          },
        },
      });

      const result = await AwsSsmConnector.actions.getAutomationExecution.handler(mockContext, {
        automationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab',
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        AutomationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab',
      });
      expect(result).toMatchObject({
        status: 'InProgress',
        currentStepName: 'startInstances',
        executionStartTime: '2023-11-14T22:13:20.500Z',
        executionEndTime: null,
        steps: [
          {
            stepName: 'stopInstances',
            action: 'aws:changeInstanceState',
            stepStatus: 'Success',
            executionEndTime: '2023-11-14T22:14:20.000Z',
            outputs: { InstanceStates: ['stopped'] },
          },
          {
            stepName: 'startInstances',
            stepStatus: 'Failed',
            failureDetails: {
              failureStage: 'InputValidation',
              failureType: 'Permission',
              details: { VerificationErrorMessage: ['The session credentials have expired'] },
            },
          },
        ],
        stepsTruncated: false,
      });
    });

    it.each([
      ['Success', true],
      ['Failed', true],
      ['TimedOut', true],
      ['Cancelled', true],
      ['Rejected', true],
      ['ChangeCalendarOverrideRejected', true],
      ['CompletedWithSuccess', true],
      ['CompletedWithFailure', true],
      ['Exited', true],
      ['Pending', false],
      ['InProgress', false],
      ['Waiting', false],
      ['Cancelling', false],
      ['PendingApproval', false],
      ['Approved', false],
      ['Scheduled', false],
      ['RunbookInProgress', false],
      ['PendingChangeCalendarOverride', false],
      ['ChangeCalendarOverrideApproved', false],
    ])('reports status %s as finished: %s', async (AutomationExecutionStatus, isFinished) => {
      mockClient.post.mockResolvedValue({
        data: { AutomationExecution: { AutomationExecutionStatus } },
      });

      const result = await AwsSsmConnector.actions.getAutomationExecution.handler(mockContext, {
        automationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab',
      });

      expect(result).toMatchObject({ isFinished });
    });
  });

  describe('getInventory', () => {
    it('sends key/values/type filters, and returns the entries with their capture time', async () => {
      const entry = { Name: 'openssl', Version: '3.2.2' };
      mockClient.post.mockResolvedValue({
        data: { CaptureTime: '2026-11-18T13:07:45Z', Entries: [entry], NextToken: '' },
      });

      const result = await AwsSsmConnector.actions.getInventory.handler(mockContext, {
        instanceId: 'i-1234567890abcdef0',
        typeName: 'AWS:Application',
        filters: [{ key: 'Name', values: ['openssl'], type: 'BeginWith' }],
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        InstanceId: 'i-1234567890abcdef0',
        TypeName: 'AWS:Application',
        Filters: [{ Key: 'Name', Values: ['openssl'], Type: 'BeginWith' }],
      });
      expect(result).toEqual({
        captureTime: '2026-11-18T13:07:45Z',
        entries: [entry],
        nextToken: null,
      });
    });
  });

  describe('findNodesByInventory', () => {
    it('asks for the instance information only, and returns it for each matching node', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          Entities: [
            {
              Id: 'i-1234567890abcdef0',
              Data: {
                'AWS:InstanceInformation': {
                  Content: [
                    {
                      ComputerName: 'ip-172-31-43-172',
                      PlatformName: 'Amazon Linux',
                      PlatformVersion: '2023',
                      IpAddress: '172.31.43.172',
                      InstanceStatus: 'Active',
                    },
                  ],
                },
              },
            },
          ],
        },
      });

      const result = await AwsSsmConnector.actions.findNodesByInventory.handler(mockContext, {
        filters: [{ key: 'AWS:Application.Name', values: ['openssl'] }],
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        Filters: [{ Key: 'AWS:Application.Name', Values: ['openssl'] }],
        ResultAttributes: [{ TypeName: 'AWS:InstanceInformation' }],
      });
      expect(result).toEqual({
        nodes: [
          {
            instanceId: 'i-1234567890abcdef0',
            computerName: 'ip-172-31-43-172',
            platformName: 'Amazon Linux',
            platformVersion: '2023',
            ipAddress: '172.31.43.172',
            instanceStatus: 'Active',
          },
        ],
        nextToken: null,
      });
    });
  });

  describe('listAutomationExecutions', () => {
    it('sends each filter as a key with its values, and reports which executions are finished', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          AutomationExecutionMetadataList: [
            {
              AutomationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab',
              AutomationExecutionStatus: 'Success',
              ExecutionStartTime: 1700000000.5,
            },
            {
              AutomationExecutionId: '5216b5ad-f944-11e6-9d32-0123456789ab',
              AutomationExecutionStatus: 'InProgress',
            },
          ],
          NextToken: 'token',
        },
      });

      const result = await AwsSsmConnector.actions.listAutomationExecutions.handler(mockContext, {
        documentNamePrefix: 'AWS-Restart',
        status: ['Success', 'InProgress'],
        startTimeAfter: '2026-11-01T00:00:00Z',
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        Filters: [
          { Key: 'DocumentNamePrefix', Values: ['AWS-Restart'] },
          { Key: 'ExecutionStatus', Values: ['Success', 'InProgress'] },
          { Key: 'StartTimeAfter', Values: ['2026-11-01T00:00:00Z'] },
        ],
      });
      expect(result).toEqual({
        automationExecutions: [
          expect.objectContaining({
            automationExecutionId: '4105a4fc-f944-11e6-9d32-0123456789ab',
            isFinished: true,
            executionStartTime: '2023-11-14T22:13:20.500Z',
            executionEndTime: null,
          }),
          expect.objectContaining({ isFinished: false }),
        ],
        nextToken: 'token',
      });
    });
  });
});
