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

const trendLabels = { sortUp: 'upward direction', sortDown: 'downward direction', grab: 'stable' };

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
      fontSize={16}
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
      expect(el).toBeEmptyDOMElement();
    });
  });

  describe('with badge', () => {
    describe('static color', () => {
      it('should render a badge with a static color', () => {
        const color = faker.internet.color();

        renderSecondaryMetric({ color });

        const el = screen.getByTitle(formattedValue);

        expect(el).toBeInTheDocument();
        expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${color}`);
        expect(screen.getByText(formattedValue)).toBeInTheDocument();
      });

      it('should return the N/A string if no value is provided', () => {
        const color = faker.internet.color();

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
        faker.internet.color(),
        faker.internet.color(),
        faker.internet.color(),
      ];

      const trendCombinations = [
        { baseline: rawValue - 1, color: palette[2], icon: 'sortUp' as const },
        { baseline: rawValue + 1, color: palette[0], icon: 'sortDown' as const },
        { baseline: rawValue, color: palette[1], icon: 'grab' as const },
      ];
      describe('with both icon and values', () => {
        it.each(trendCombinations)(
          'should render a badge with the trend icon "$icon" and the formatted value',
          ({ baseline, color, icon }) => {
            renderSecondaryMetric({
              trendConfig: {
                icon: true,
                value: true,
                palette,
                baselineValue: baseline,
              },
            });

            const trendLabel = trendLabels[icon];
            const el = screen.getByTitle(formattedValue);

            expect(el).toBeInTheDocument();
            expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${color}`);
            expect(screen.getByText(formattedValue)).toBeInTheDocument();
            // unfortuantely the icon is not rendered, so check for the wrapper for now
            expect(el.firstChild?.firstChild).toHaveAttribute('data-euiicon-type', icon);
            expect(
              screen.queryByLabelText(`Value: ${formattedValue} - Changed to ${trendLabel}`)
            ).not.toBeInTheDocument();
          }
        );

        it('should compute the delta value correctly with undefined baseline', () => {
          renderSecondaryMetric({
            trendConfig: {
              icon: true,
              value: true,
              palette,
              baselineValue: undefined,
            },
          });

          const icon = 'grab';

          const trendLabel = trendLabels[icon];
          const el = screen.getByTitle(formattedValue);

          expect(el).toBeInTheDocument();
          expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${palette[1]}`);
          expect(screen.getByText(formattedValue)).toBeInTheDocument();
          // unfortuantely the icon is not rendered, so check for the wrapper for now
          expect(el.firstChild?.firstChild).toHaveAttribute('data-euiicon-type', icon);
          expect(
            screen.queryByLabelText(`Value: ${formattedValue} - Changed to ${trendLabel}`)
          ).not.toBeInTheDocument();
        });

        it('should compute the delta value correctly with undefined rawValue', () => {
          renderSecondaryMetric({
            row: { [id]: undefined },
            getMetricFormatter: jest.fn(() => () => undefined as unknown as string),
            trendConfig: {
              icon: true,
              value: true,
              palette,
              baselineValue: 1,
            },
          });

          const icon = 'grab';

          const trendLabel = trendLabels[icon];
          const el = screen.getByTitle('N/A');

          expect(el).toBeInTheDocument();
          expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${palette[1]}`);
          expect(screen.getByText('N/A')).toBeInTheDocument();
          // unfortuantely the icon is not rendered, so check for the wrapper for now
          expect(el.firstChild?.firstChild).toHaveAttribute('data-euiicon-type', icon);
          expect(
            screen.queryByLabelText(`Value: 'N/A' - Changed to ${trendLabel}`)
          ).not.toBeInTheDocument();
        });

        it('should compute the delta value correctly with both baseline and rawValue undefined', () => {
          renderSecondaryMetric({
            row: { [id]: undefined },
            getMetricFormatter: jest.fn(() => () => undefined as unknown as string),
            trendConfig: {
              icon: true,
              value: true,
              palette,
              baselineValue: 0,
            },
          });

          const icon = 'grab';

          const trendLabel = trendLabels[icon];
          const el = screen.getByTitle('N/A');

          expect(el).toBeInTheDocument();
          expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${palette[1]}`);
          expect(screen.getByText('N/A')).toBeInTheDocument();
          // unfortuantely the icon is not rendered, so check for the wrapper for now
          expect(el.firstChild?.firstChild).toHaveAttribute('data-euiicon-type', icon);
          expect(
            screen.queryByLabelText(`Value: N/A - Changed to ${trendLabel}`)
          ).not.toBeInTheDocument();
        });
      });

      describe('with icon only', () => {
        it.each(trendCombinations)(
          'should render only the icon "$icon"',
          ({ baseline, color, icon }) => {
            renderSecondaryMetric({
              trendConfig: {
                icon: true,
                value: false,
                palette,
                baselineValue: baseline,
              },
            });

            const trendLabel = trendLabels[icon];

            const el = screen.getByLabelText(`Value: ${formattedValue} - Changed to ${trendLabel}`);

            expect(el).toBeInTheDocument();
            expect(el).toHaveStyle(`--euiBadgeBackgroundColor: ${color}`);
            expect(screen.queryByText(formattedValue)).not.toBeInTheDocument();
            // unfortuantely the icon is not rendered, so check for the wrapper for now
            expect(el.firstChild?.firstChild).toHaveAttribute('data-euiicon-type', icon);
          }
        );
      });

      describe('with value only', () => {
        it.each(trendCombinations)(
          'should render the badge with value and color $color',
          ({ baseline, color, icon }) => {
            renderSecondaryMetric({
              trendConfig: {
                icon: false,
                value: true,
                palette,
                baselineValue: baseline,
              },
            });

            const trendLabel = trendLabels[icon];

            expect(screen.getByTitle(formattedValue)).toHaveStyle(
              `--euiBadgeBackgroundColor: ${color}`
            );
            expect(
              screen.queryByLabelText(`Value: ${formattedValue} - Changed to ${trendLabel}`)
            ).not.toBeInTheDocument();
            expect(screen.getByText(formattedValue)).toBeInTheDocument();
          }
        );
      });
    });
  });
});
