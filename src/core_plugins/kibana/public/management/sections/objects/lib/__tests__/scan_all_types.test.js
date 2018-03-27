import { scanAllTypes } from '../scan_all_types';

let mockScanAndMapCallCount = 0;

jest.mock('ui/utils/scanner', () => ({
  Scanner: class {
    constructor() {
      this.scanAndMap = () => {
        mockScanAndMapCallCount++;
      };
    }
  },
}));

describe('scanAllTypes', () => {
  beforeEach(() => {
    mockScanAndMapCallCount = 0;
  });

  it('should use the scanner utility', async () => {
    const $http = {};
    const kbnIndex = '.kibana';
    const typesToInclude = ['index-pattern', 'dashboard'];

    await scanAllTypes($http, kbnIndex, typesToInclude);
    expect(mockScanAndMapCallCount).toBe(1);
  });
});
