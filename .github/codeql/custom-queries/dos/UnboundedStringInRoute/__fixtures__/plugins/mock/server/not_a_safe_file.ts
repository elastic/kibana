// This should alert! This verifies that the codeql test infra can handle these nested test fixtures correctly.
import { schema } from '@kbn/config-schema';

export const uiSettings = {
  'myPlugin:setting': {
    name: 'My setting',
    value: '',
    schema: schema.string(),
  },
};
