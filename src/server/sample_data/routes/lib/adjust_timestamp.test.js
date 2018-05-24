
import { adjustTimestamp } from './adjust_timestamp';

const currentTimeMarker = new Date(Date.parse('2018-01-02T00:00:00Z'));
const now = new Date(Date.parse('2018-04-25T18:24:58.650Z')); // Wednesday

describe('relative to now', () => {
  test('adjusts time to 10 minutes in past from now', () => {
    const originalTimestamp = '2018-01-01T23:50:00Z'; // -10 minutes relative to currentTimeMarker
    const timestamp = adjustTimestamp(originalTimestamp, currentTimeMarker, now, false);
    expect(timestamp).toBe('2018-04-25T18:14:58.650Z');
  });

  test('adjusts time to 1 hour in future from now', () => {
    const originalTimestamp = '2018-01-02T01:00:00Z'; // + 1 hour relative to currentTimeMarker
    const timestamp = adjustTimestamp(originalTimestamp, currentTimeMarker, now, false);
    expect(timestamp).toBe('2018-04-25T19:24:58.650Z');
  });
});

describe('preserve day of week and time of day', () => {
  test('adjusts time to monday of the same week as now', () => {
    const originalTimestamp = '2018-01-01T23:50:00Z'; // Monday, same week relative to currentTimeMarker
    const timestamp = adjustTimestamp(originalTimestamp, currentTimeMarker, now, true);
    expect(timestamp).toBe('2018-04-23T23:50:00Z');
  });

  test('adjusts time to friday of the same week as now', () => {
    const originalTimestamp = '2017-12-29T23:50:00Z'; // Friday, same week relative to currentTimeMarker
    const timestamp = adjustTimestamp(originalTimestamp, currentTimeMarker, now, true);
    expect(timestamp).toBe('2018-04-27T23:50:00Z');
  });

  test('adjusts time to monday of the previous week as now', () => {
    const originalTimestamp = '2017-12-25T23:50:00Z'; // Monday, previous week relative to currentTimeMarker
    const timestamp = adjustTimestamp(originalTimestamp, currentTimeMarker, now, true);
    expect(timestamp).toBe('2018-04-16T23:50:00Z');
  });

  test('adjusts time to friday of the week after now', () => {
    const originalTimestamp = '2018-01-05T23:50:00Z'; // Friday, next week relative to currentTimeMarker
    const timestamp = adjustTimestamp(originalTimestamp, currentTimeMarker, now, true);
    expect(timestamp).toBe('2018-05-04T23:50:00Z');
  });
});

