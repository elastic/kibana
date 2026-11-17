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

      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        'https://ssm.us-east-1.amazonaws.com/',
        JSON.stringify({
          Filters: [
            { Key: 'InstanceIds', Values: ['i-1234567890abcdef0'] },
            { Key: 'PingStatus', Values: ['Online'] },
            { Key: 'PlatformTypes', Values: ['Linux'] },
          ],
          MaxResults: 10,
        }),
        {
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AmazonSSM.DescribeInstanceInformation',
          },
        }
      );
      expect(JSON.parse(mockClient.post.mock.calls[1][1])).toEqual({
        Filters: [{ Key: 'tag:Env', Values: ['prod'] }],
      });
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

    const message = 'User is not authorized to perform ssm:DescribeInstanceInformation';

    it.each([
      ['body', {}, { __type: 'com.amazonaws.ssm#AccessDeniedException', message }],
      [
        'x-amzn-ErrorType header',
        { 'x-amzn-errortype': 'AccessDeniedException:http://internal.amazon.com/coral/' },
        { message },
      ],
    ])(
      'surfaces the AWS error code from the %s and the message',
      async (_source, headers, data) => {
        mockClient.post.mockRejectedValue(
          new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, {}, {
            status: 400,
            headers,
            data,
          } as AxiosResponse)
        );

        await expect(describeInstanceInformation.handler(mockContext, {})).rejects.toThrow(
          `AmazonSSM.DescribeInstanceInformation failed (AccessDeniedException): ${message}`
        );
      }
    );
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
      });

      expect(JSON.parse(mockClient.post.mock.calls[0][1])).toEqual({
        CommandId: '2b8e7fd1-8a2e-4b8f-9d6a-0123456789ab',
        InstanceId: 'i-1234567890abcdef0',
      });
      expect(result).toMatchObject({
        status: 'InProgress',
        responseCode: -1,
        executionStartDateTime: '2023-11-14T22:13:21.181Z',
        executionEndDateTime: null,
        standardOutput: ' 22:13:21 up 3 days',
      });
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
    it('returns the status and each step, with no end time while it runs', async () => {
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
        ],
        stepsTruncated: false,
      });
    });
  });
});
