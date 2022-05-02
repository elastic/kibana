export const tracingEcs = {
  id: {
    dashed_name: 'transaction-id',
    description: 'Unique identifier of the transaction within the scope of its trace.\n' +
      'A transaction is the highest level of work measured within a service, such as a request to a server.',
    example: '00f067aa0ba902b7',
    flat_name: 'transaction.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'transaction.id',
    normalize: [],
    short: 'Unique identifier of the transaction within the scope of its trace.',
    type: 'keyword'
  }
}