export const faasEcs = {
  coldstart: {
    dashed_name: 'faas-coldstart',
    description: 'Boolean value indicating a cold start of a function.',
    flat_name: 'faas.coldstart',
    level: 'extended',
    name: 'coldstart',
    normalize: [],
    short: 'Boolean value indicating a cold start of a function.',
    type: 'boolean'
  },
  execution: {
    dashed_name: 'faas-execution',
    description: 'The execution ID of the current function execution.',
    example: 'af9d5aa4-a685-4c5f-a22b-444f80b3cc28',
    flat_name: 'faas.execution',
    ignore_above: 1024,
    level: 'extended',
    name: 'execution',
    normalize: [],
    short: 'The execution ID of the current function execution.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'faas-id',
    description: 'The unique identifier of a serverless function.\n' +
      "For AWS Lambda it's the function ARN (Amazon Resource Name) without a version or alias suffix.",
    example: 'arn:aws:lambda:us-west-2:123456789012:function:my-function',
    flat_name: 'faas.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'The unique identifier of a serverless function.',
    type: 'keyword'
  },
  name: {
    dashed_name: 'faas-name',
    description: 'The name of a serverless function.',
    example: 'my-function',
    flat_name: 'faas.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'The name of a serverless function.',
    type: 'keyword'
  },
  trigger: {
    dashed_name: 'faas-trigger',
    description: 'Details about the function trigger.',
    flat_name: 'faas.trigger',
    level: 'extended',
    name: 'trigger',
    normalize: [],
    short: 'Details about the function trigger.',
    type: {
      dashed_name: 'faas-trigger-type',
      description: 'The trigger for the function execution.\n' +
        'Expected values are:\n' +
        '  * http\n' +
        '  * pubsub\n' +
        '  * datasource\n' +
        '  * timer\n' +
        '  * other',
      example: 'http',
      flat_name: 'faas.trigger.type',
      ignore_above: 1024,
      level: 'extended',
      name: 'trigger.type',
      normalize: [],
      short: 'The trigger for the function execution.',
      type: 'keyword'
    },
    request_id: {
      dashed_name: 'faas-trigger-request-id',
      description: 'The ID of the trigger request , message, event, etc.',
      example: 123456789,
      flat_name: 'faas.trigger.request_id',
      ignore_above: 1024,
      level: 'extended',
      name: 'trigger.request_id',
      normalize: [],
      short: 'The ID of the trigger request , message, event, etc.',
      type: 'keyword'
    }
  },
  version: {
    dashed_name: 'faas-version',
    description: 'The version of a serverless function.',
    example: '123',
    flat_name: 'faas.version',
    ignore_above: 1024,
    level: 'extended',
    name: 'version',
    normalize: [],
    short: 'The version of a serverless function.',
    type: 'keyword'
  }
}