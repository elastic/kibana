import { extractIndexPatterns } from '../extract_index_patterns';
import { expect } from 'chai';
describe('extractIndexPatterns(vis)', () => {
  let vis;
  beforeEach(() => {
    vis = {
      fields: {
        '*': []
      },
      params: {
        index_pattern: '*',
        series: [
          {
            override_index_pattern: 1,
            series_index_pattern: 'example-1-*'
          },
          {
            override_index_pattern: 1,
            series_index_pattern: 'example-2-*'
          }
        ],
        annotations: [
          { index_pattern: 'notes-*' },
          { index_pattern: 'example-1-*' }
        ]
      }
    };
  });

  it('should return index patterns', () => {
    vis.fields = {};
    expect(extractIndexPatterns(vis)).to.eql([
      '*',
      'example-1-*',
      'example-2-*',
      'notes-*'
    ]);
  });

  it('should return index patterns that do not exist in vis.fields', () => {
    expect(extractIndexPatterns(vis)).to.eql([
      'example-1-*',
      'example-2-*',
      'notes-*'
    ]);
  });
});
