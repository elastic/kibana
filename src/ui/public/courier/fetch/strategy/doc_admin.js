import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function DocAdminStrategyProvider(Private) {
  const savedObjects = Private(SavedObjectsClientProvider);

  return {
    id: 'doc_admin',

    fetch(requests) {
      return savedObjects.mget(
        requests.map(req => ({
          type: req.source.get('type'),
          id: req.source.get('id'),
        }))
      )
      .then(resp => resp.docs);
    },
  };
}
