export async function ensureAllowExplicitIndex(callWithInternalUser, config) {
  const resp = await callWithInternalUser('mget', {
    ignore: [400],
    body: {
      docs: [
        {
          _index: config.get('kibana.index'),
          _type: 'config',
          _id: config.get('pkg.version'),
        },
      ],
    },
  });

  if (!resp.error) {
    return true;
  }

  const error = resp.error || {};
  const errorReason = error.reason || '';

  const isArgError = error.type === 'illegal_argument_exception';
  const isExplicitIndexException = isArgError && errorReason.includes('explicit index');

  if (isExplicitIndexException) {
    throw new Error(
      'Kibana must be able to specify the index within Elasticsearch multi-requests ' +
      '(rest.action.multi.allow_explicit_index=true).'
    );
  }

  throw new Error(
    'Unable to ensure that rest.action.multi.allow_explicit_index=true: ' +
    `[${error.type}] ${errorReason}`
  );
}
