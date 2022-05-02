export const errorEcs = {
  code: {
    dashed_name: 'error-code',
    description: 'Error code describing the error.',
    flat_name: 'error.code',
    ignore_above: 1024,
    level: 'core',
    name: 'code',
    normalize: [],
    short: 'Error code describing the error.',
    type: 'keyword'
  },
  id: {
    dashed_name: 'error-id',
    description: 'Unique identifier for the error.',
    flat_name: 'error.id',
    ignore_above: 1024,
    level: 'core',
    name: 'id',
    normalize: [],
    short: 'Unique identifier for the error.',
    type: 'keyword'
  },
  message: {
    dashed_name: 'error-message',
    description: 'Error message.',
    flat_name: 'error.message',
    level: 'core',
    name: 'message',
    normalize: [],
    short: 'Error message.',
    type: 'match_only_text'
  },
  stack_trace: {
    dashed_name: 'error-stack-trace',
    description: 'The stack trace of this error in plain text.',
    flat_name: 'error.stack_trace',
    level: 'extended',
    multi_fields: [ [Object] ],
    name: 'stack_trace',
    normalize: [],
    short: 'The stack trace of this error in plain text.',
    type: 'wildcard'
  },
  type: {
    dashed_name: 'error-type',
    description: 'The type of the error, for example the class name of the exception.',
    example: 'java.lang.NullPointerException',
    flat_name: 'error.type',
    ignore_above: 1024,
    level: 'extended',
    name: 'type',
    normalize: [],
    short: 'The type of the error, for example the class name of the exception.',
    type: 'keyword'
  }
}