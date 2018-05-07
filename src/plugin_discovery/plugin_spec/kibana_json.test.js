import { resolve } from 'path';

import { parseKibanaJson } from './kibana_json';
import { PLUGINS_DIR, PluginsDirErrorSerializer, PluginsDirStringSerializer } from './__fixtures__/utils';

expect.addSnapshotSerializer(PluginsDirErrorSerializer);
expect.addSnapshotSerializer(PluginsDirStringSerializer);

describe('parseKibanaJson()', () => {
  it('throws InvalidPluginError if kibana.json is missing', async () => {
    await expect(parseKibanaJson(resolve(PLUGINS_DIR, 'lib'))).rejects.toThrowErrorMatchingSnapshot();
  });

  it('throws validation error if kibana.json is invalid', async () => {
    await expect(parseKibanaJson(resolve(PLUGINS_DIR, 'missing_id'))).rejects.toThrowErrorMatchingSnapshot();
  });

  it('returns parsed kibana.json with defaults', async () => {
    await expect(parseKibanaJson(resolve(PLUGINS_DIR, 'foo'))).resolves.toMatchSnapshot();
  });
});
