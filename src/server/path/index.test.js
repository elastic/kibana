import { getConfig, getData } from './';
import { accessSync, R_OK } from 'fs';

describe('Default path finder', function () {
  it('should find a kibana.yml', () => {
    const configPath = getConfig();
    expect(() => accessSync(configPath, R_OK)).not.toThrow();
  });

  it('should find a data directory', () => {
    const dataPath = getData();
    expect(() => accessSync(dataPath, R_OK)).not.toThrow();
  });
});
