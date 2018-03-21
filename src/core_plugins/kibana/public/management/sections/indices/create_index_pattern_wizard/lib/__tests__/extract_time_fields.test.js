import { extractTimeFields } from '../extract_time_fields';

describe('extractTimeFields', () => {
  it('should handle no date fields', () => {
    const fields = [
      { type: 'text' },
      { type: 'text' },
    ];

    expect(extractTimeFields(fields)).toEqual([
      { display: `The indices which match this index pattern don't contain any time fields.` }
    ]);
  });

  it('should add extra options', () => {
    const fields = [
      { type: 'date', name: '@timestamp' },
    ];

    expect(extractTimeFields(fields)).toEqual([
      { display: '@timestamp', fieldName: '@timestamp' },
      { isDisabled: true, display: '───', fieldName: '' },
      { display: `I don't want to use the Time Filter`, fieldName: undefined },
    ]);
  });
});
