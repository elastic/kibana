// Test: UI settings files should be EXCLUDED (no alerts).
import { schema } from '@kbn/config-schema';

export const uiSettings = {
  'myPlugin:logSources': {
    name: 'Log sources',
    value: ['logs-*'],
    type: 'array',
    schema: schema.arrayOf(schema.string()),
  },
};
