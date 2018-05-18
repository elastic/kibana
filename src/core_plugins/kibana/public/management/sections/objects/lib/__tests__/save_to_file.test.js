import { saveToFile } from '../save_to_file';

jest.mock('@elastic/filesaver', () => ({
  saveAs: jest.fn(),
}));

describe('saveToFile', () => {
  let saveAs;

  beforeEach(() => {
    saveAs = require('@elastic/filesaver').saveAs;
    saveAs.mockClear();
  });

  it('should use the file saver utility', async () => {
    saveToFile(JSON.stringify({ foo: 1 }));
    expect(saveAs.mock.calls.length).toBe(1);
  });
});
