// Test: UI settings files should be EXCLUDED (no alerts).
// These define Advanced Settings value schemas.
import { schema } from '@kbn/config-schema';

export const uiSettings = {
  'myPlugin:setting': {
    name: 'My setting',
    value: '',
    schema: schema.string(),
  },
};
