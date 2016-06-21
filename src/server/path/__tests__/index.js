import expect from 'expect.js';
import path from '../';
import { accessSync, R_OK} from 'fs';

describe('Default path finder', function () {
  it('should find a kibana.yml', () => {
    const configPath = path.getConfig();
    expect(() => accessSync(configPath, R_OK)).to.not.throwError();
  });

  it('should find a data directory', () => {
    const dataPath = path.getData();
    expect(() => accessSync(dataPath, R_OK)).to.not.throwError();
  });
});
