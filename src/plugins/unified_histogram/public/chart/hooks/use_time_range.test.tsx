/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { TimeRange } from '@kbn/data-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import { UnifiedHistogramBucketInterval } from '../../types';
import { useTimeRange } from './use_time_range';

jest.mock('@kbn/datemath', () => ({
  parse: jest.fn((datetime: string) => {
    return {
      format: jest.fn(() => {
        return datetime;
      }),
    };
  }),
}));

describe('useTimeRange', () => {
  const uiSettings = uiSettingsServiceMock.createStartContract();
  uiSettings.get.mockReturnValue('dateFormat');
  const bucketInterval: UnifiedHistogramBucketInterval = {
    description: '1 minute',
  };
  const timeRange: TimeRange = {
    from: '2022-11-17T00:00:00.000Z',
    to: '2022-11-17T12:00:00.000Z',
  };
  const timeInterval = 'auto';

  it('should return time range text', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        bucketInterval,
        timeRange,
        timeInterval,
      })
    );
    expect(result.current.timeRangeText).toMatchInlineSnapshot(
      `"2022-11-17T00:00:00.000Z - 2022-11-17T12:00:00.000Z (interval: Auto - 1 minute)"`
    );
  });

  it('should return time range text when timeInterval is not auto', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        bucketInterval,
        timeRange,
        timeInterval: '1m',
      })
    );
    expect(result.current.timeRangeText).toMatchInlineSnapshot(
      `"2022-11-17T00:00:00.000Z - 2022-11-17T12:00:00.000Z (interval: 1 minute)"`
    );
  });

  it('should return time range text when bucketInterval is undefined', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        timeRange,
        timeInterval,
      })
    );
    expect(result.current.timeRangeText).toMatchInlineSnapshot(
      `"2022-11-17T00:00:00.000Z - 2022-11-17T12:00:00.000Z (interval: Auto - Loading)"`
    );
  });

  it('should render time range display', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        bucketInterval,
        timeRange,
        timeInterval,
      })
    );
    expect(result.current.timeRangeDisplay).toMatchInlineSnapshot(`
      <EuiText
        css={
          Object {
            "map": undefined,
            "name": "1vgo99t",
            "next": undefined,
            "styles": "
          padding: 0 8px 0 8px;
        ",
            "toString": [Function],
          }
        }
        size="xs"
        textAlign="center"
      >
        2022-11-17T00:00:00.000Z - 2022-11-17T12:00:00.000Z (interval: Auto - 1 minute)
      </EuiText>
    `);
  });

  it('should render time range display when buckets are too large', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        bucketInterval: {
          ...bucketInterval,
          scaled: true,
          scale: 2,
        },
        timeRange,
        timeInterval,
      })
    );
    expect(result.current.timeRangeDisplay).toMatchInlineSnapshot(`
      <EuiFlexGroup
        alignItems="baseline"
        css={
          Object {
            "map": undefined,
            "name": "1ly21re",
            "next": undefined,
            "styles": "
            flex-grow: 0;
          ",
            "toString": [Function],
          }
        }
        gutterSize="none"
        justifyContent="center"
        responsive={false}
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiText
            css={
              Object {
                "map": undefined,
                "name": "1vgo99t",
                "next": undefined,
                "styles": "
          padding: 0 8px 0 8px;
        ",
                "toString": [Function],
              }
            }
            size="xs"
            textAlign="center"
          >
            2022-11-17T00:00:00.000Z - 2022-11-17T12:00:00.000Z (interval: Auto - 1 minute)
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          <EuiIconTip
            color="warning"
            content="This interval creates buckets that are too large to show in the selected time range, so it has been scaled to 1 minute."
            title="Warning"
            type="warning"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });

  it('should render time range display when there are too many buckets', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        bucketInterval: {
          ...bucketInterval,
          scaled: true,
          scale: 0.5,
        },
        timeRange,
        timeInterval,
      })
    );
    expect(result.current.timeRangeDisplay).toMatchInlineSnapshot(`
      <EuiFlexGroup
        alignItems="baseline"
        css={
          Object {
            "map": undefined,
            "name": "1ly21re",
            "next": undefined,
            "styles": "
            flex-grow: 0;
          ",
            "toString": [Function],
          }
        }
        gutterSize="none"
        justifyContent="center"
        responsive={false}
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiText
            css={
              Object {
                "map": undefined,
                "name": "1vgo99t",
                "next": undefined,
                "styles": "
          padding: 0 8px 0 8px;
        ",
                "toString": [Function],
              }
            }
            size="xs"
            textAlign="center"
          >
            2022-11-17T00:00:00.000Z - 2022-11-17T12:00:00.000Z (interval: Auto - 1 minute)
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          <EuiIconTip
            color="warning"
            content="This interval creates too many buckets to show in the selected time range, so it has been scaled to 1 minute."
            title="Warning"
            type="warning"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });

  it('should render time range display and no interval for text based languages', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        bucketInterval,
        timeRange,
        timeInterval,
        isPlainRecord: true,
        timeField: '@timestamp',
      })
    );
    expect(result.current.timeRangeDisplay).toMatchInlineSnapshot(`
      <EuiText
        css={
          Object {
            "map": undefined,
            "name": "1vgo99t",
            "next": undefined,
            "styles": "
          padding: 0 8px 0 8px;
        ",
            "toString": [Function],
          }
        }
        size="xs"
        textAlign="center"
      >
        2022-11-17T00:00:00.000Z - 2022-11-17T12:00:00.000Z
      </EuiText>
    `);
  });

  it('should not render a text for text based languages when not timeField is provided', () => {
    const { result } = renderHook(() =>
      useTimeRange({
        uiSettings,
        bucketInterval,
        timeRange,
        timeInterval,
        isPlainRecord: true,
      })
    );
    expect(result.current.timeRangeDisplay).toBeNull();
  });
});
