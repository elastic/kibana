/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { type Datatable } from '@kbn/expressions-plugin/common';
import { SecondaryMetric, type SecondaryMetricProps } from './secondary_metric';
import { faker } from '@faker-js/faker';

const id = faker.string.uuid();
const column: Datatable['columns'][number] = {
  id,
  name: faker.database.column(),
  meta: {
    type: 'string',
    source: faker.database.engine(),
  },
};
const formattedValue = faker.string.numeric(3);
const rawValue = parseInt(formattedValue, 10);

const trendLabels = {
  arrowUp: { icon: '\u{2191}', description: 'upward direction' },
  arrowDown: { icon: '\u{2193}', description: 'downward direction' },
  equal: { icon: '\u{003D}', description: 'stable' },
  na: { icon: '', description: '' },
} as const;

type TrendLabelsKeys = keyof typeof trendLabels;

function renderSecondaryMetric(props: Partial<SecondaryMetricProps> = {}) {
  render(
    <SecondaryMetric
      columns={[column]}
      row={{ [id]: rawValue }}
      config={{
        dimensions: { secondaryMetric: id },
        metric: { secondaryPrefix: '' },
      }}
      getMetricFormatter={jest.fn(() => () => formattedValue)}
      {...props}
    />
  );
}

describe('Secondary metric', () => {
  describe('no badge', () => {
    it('should return a string if no color or trend is provided', () => {
      renderSecondaryMetric();

      const el = screen.getByText(formattedValue);
      expect(el).toBeInTheDocument();
    });

    it('should return the empty string if no value is provided', () => {
      renderSecondaryMetric({
        row: { [id]: undefined },
        getMetricFormatter: jest.fn(() => () => undefined as unknown as string),
      });
      // Test id is the last resource here as the element will be empty
      const el = screen.getByTestId('metric-secondary-element');
      expect(el.textContent).toBe('');
    });
  });

  describe('with badge', () => {
    describe('static color', () => {
      it('should render a badge with a static color', () => {
        const color = faker.color.rgb();

        renderSecondaryMetric({ color });

        const el = screen.getByTitle(formattedValue);

        expect(el).toBeInTheDocument();
        expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${color}`);
        expect(screen.getByText(formattedValue)).toBeInTheDocument();
      });

      it('should return the N/A string if no value is provided', () => {
        const color = faker.color.rgb();

        renderSecondaryMetric({
          color,
          row: { [id]: undefined },
          getMetricFormatter: jest.fn(() => () => undefined as unknown as string),
        });

        const el = screen.getByTitle('N/A');

        expect(el).toBeInTheDocument();
        expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${color}`);
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });

    describe('dynamic color', () => {
      const palette: [string, string, string] = [
        faker.color.rgb(),
        faker.color.rgb(),
        faker.color.rgb(),
      ];
      const [lowerColor, neutralColor, higherColor] = palette;

      const badgeConfigs = [
        { showIcon: true, showValue: true, name: 'both icon and values' },
        { showIcon: false, showValue: true, name: 'value only' },
        { showIcon: true, showValue: false, name: 'icon only' },
      ];

      interface TrendCombination {
        // this is used just to make the title stable
        valueFinite: string;
        value: number | undefined;
        // this is used just to make the title stable
        baselineFinite: string;
        baseline: number | undefined;
        color: string;
        icon: TrendLabelsKeys;
      }

      const trendCombinations: TrendCombination[] = [
        {
          valueFinite: 'finite',
          value: rawValue,
          baselineFinite: 'finite',
          baseline: rawValue - 1,
          color: higherColor,
          icon: 'arrowUp',
        },
        {
          valueFinite: 'finite',
          value: rawValue,
          baselineFinite: 'finite',
          baseline: rawValue + 1,
          color: lowerColor,
          icon: 'arrowDown',
        },
        {
          valueFinite: 'finite',
          value: rawValue,
          baselineFinite: 'finite',
          baseline: rawValue,
          color: neutralColor,
          icon: 'equal',
        },
        {
          valueFinite: 'finite',
          value: rawValue,
          baselineFinite: 'NaN',
          baseline: NaN,
          color: neutralColor,
          icon: 'na',
        },
        {
          valueFinite: 'finite',
          value: rawValue,
          baselineFinite: 'undefined',
          baseline: undefined,
          color: neutralColor,
          icon: 'na',
        },
        {
          valueFinite: 'undefined',
          value: undefined,
          baselineFinite: 'finite',
          baseline: rawValue,
          color: neutralColor,
          icon: 'na',
        },
        {
          valueFinite: 'NaN',
          value: NaN,
          baselineFinite: 'finite',
          baseline: rawValue,
          color: neutralColor,
          icon: 'na',
        },
        {
          valueFinite: 'NaN',
          value: NaN,
          baselineFinite: 'NaN',
          baseline: NaN,
          color: neutralColor,
          icon: 'na',
        },
        {
          valueFinite: 'undefined',
          value: undefined,
          baselineFinite: 'undefined',
          baseline: undefined,
          color: neutralColor,
          icon: 'na',
        },
      ];
      // When compared to primary, the icon and color are inverted
      const trendCombinationCompareToPrimary: TrendCombination[] = trendCombinations.map((item) => {
        const newProps: Pick<TrendCombination, 'icon' | 'color'> =
          item.icon === 'arrowUp'
            ? { icon: 'arrowDown', color: lowerColor }
            : item.icon === 'arrowDown'
            ? { icon: 'arrowUp', color: higherColor }
            : // equal and na are the same
              { icon: item.icon, color: item.color };
        return {
          ...item,
          ...newProps,
        };
      });
      describe.each(badgeConfigs)('with $name', ({ showIcon, showValue }) => {
        it.each(trendCombinations)(
          '[Fixed baseline] should render a badge with the trend icon "$icon" and the formatted value (rawValue: $valueFinite, baseline: $baselineFinite)',
          ({ value, baseline, color, icon }) => {
            renderSecondaryMetric({
              row: { [id]: value },
              trendConfig: {
                icon: showIcon,
                value: showValue,
                palette,
                baselineValue: baseline,
                compareToPrimary: false,
              },
            });

            const { icon: iconText, description } = trendLabels[icon];

            if (showValue) {
              const badgeText = `${formattedValue}${showIcon && iconText ? ` ${iconText}` : ''}`;
              const el = screen.getByTitle(badgeText);
              expect(el).toBeInTheDocument();
              expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${color}`);
            }
            if (showValue) {
              expect(
                screen.queryByLabelText(`Value: ${formattedValue} - Changed to ${description}`)
              ).not.toBeInTheDocument();
            } else {
              if (icon === 'na') {
                expect(
                  screen.queryByLabelText(`Value: ${formattedValue} - No differences`)
                ).toBeInTheDocument();
              } else {
                expect(
                  screen.getByLabelText(`Value: ${formattedValue} - Changed to ${description}`)
                ).toBeInTheDocument();
              }
            }
          }
        );

        it.each(trendCombinationCompareToPrimary)(
          '[Compare to primary] should render a badge with the trend icon "$icon" and the formatted value (rawValue: $valueFinite, baseline: $baselineFinite)',
          ({ value, baseline, color, icon }) => {
            const getMetricFormatterMock = jest.fn(() => (v: unknown) => String(v));
            renderSecondaryMetric({
              row: { [id]: value },
              getMetricFormatter: getMetricFormatterMock,
              trendConfig: {
                icon: showIcon,
                value: showValue,
                palette,
                baselineValue: baseline,
                compareToPrimary: true,
              },
            });

            const { icon: iconText, description } = trendLabels[icon];
            const deltaValue =
              baseline == null || Number.isNaN(baseline) || value == null || Number.isNaN(value)
                ? 'N/A'
                : baseline - value;

            if (showValue) {
              const badgeText = `${deltaValue}${showIcon && iconText ? ` ${iconText}` : ''}`;
              const el = screen.getByTitle(badgeText);
              expect(el).toBeInTheDocument();
              expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${color}`);
              expect(getMetricFormatterMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                expect.objectContaining({
                  number: expect.objectContaining({ alwaysShowSign: true }),
                })
              );
            }
            if (showValue) {
              expect(
                screen.queryByLabelText(`Value: ${deltaValue} - Changed to ${description}`)
              ).not.toBeInTheDocument();
            } else {
              if (icon === 'na') {
                expect(
                  screen.queryByLabelText(`Value: ${deltaValue} - No differences`)
                ).toBeInTheDocument();
              } else {
                expect(
                  screen.getByLabelText(`Value: ${deltaValue} - Changed to ${description}`)
                ).toBeInTheDocument();
              }
            }
          }
        );
      });
    });
  });
});
