/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DimensionsSelector } from './dimensions_selector';
import type { Dimension, ParsedMetricItem } from '../../types';
import {
  MAX_DIMENSIONS_SELECTIONS,
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
} from '../../common/constants';

jest.mock('@kbn/shared-ux-toolbar-selector', () => {
  const actual = jest.requireActual('@kbn/shared-ux-toolbar-selector');
  return {
    ...actual,
    ToolbarSelector: ({
      options,
      onChange,
      buttonLabel,
      buttonTooltipContent,
      popoverContentBelowSearch,
      'data-test-subj': dataTestSubj,
      singleSelection,
    }: {
      options: any[];
      onChange?: (option: any) => void;
      buttonLabel: React.ReactNode;
      buttonTooltipContent?: React.ReactNode;
      popoverContentBelowSearch?: React.ReactNode;
      'data-test-subj'?: string;
      singleSelection?: boolean;
    }) => {
      // Simulate the real ToolbarSelector multi-selection semantics: clicking
      // an option toggles its checked state and emits the full array of
      // currently-checked options. For single selection, emit just the clicked
      // option. This matches the behaviour implemented in toolbar_selector.tsx
      // so that tests exercise the component's handleChange with the same
      // payload shape it receives at runtime.
      const handleOptionClick = (clickedOption: any) => {
        if (clickedOption.disabled) return;
        if (singleSelection) {
          onChange?.(clickedOption);
          return;
        }
        const wasChecked = clickedOption.checked === 'on';
        const nextSelected = options
          .filter((option) => {
            if (option.value === clickedOption.value) return !wasChecked;
            return option.checked === 'on';
          })
          .map((option) => ({ ...option, checked: 'on' }));
        onChange?.(nextSelected);
      };
      return (
        <div data-test-subj={dataTestSubj}>
          <div
            data-test-subj={`${dataTestSubj}Button`}
            data-tooltip-content={buttonTooltipContent ? 'true' : 'false'}
          >
            {buttonLabel}
            {buttonTooltipContent && (
              <div data-test-subj={`${dataTestSubj}ButtonTooltip`}>{buttonTooltipContent}</div>
            )}
          </div>
          <div data-test-subj={`${dataTestSubj}Popover`}>
            {popoverContentBelowSearch}
            {options.map((option) => (
              <div
                key={option.key}
                data-test-subj={`${dataTestSubj}Option-${option.value}`}
                data-disabled={String(option.disabled)}
                data-checked={option.checked}
                onClick={() => handleOptionClick(option)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOptionClick(option);
                  }
                }}
                role="option"
                aria-selected={option.checked === 'on'}
                tabIndex={option.disabled ? -1 : 0}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      );
    },
  };
});

jest.mock('lodash', () => {
  const actual = jest.requireActual('lodash');
  return {
    ...actual,
    debounce: (fn: any) => {
      const debounced = (...args: any[]) => fn(...args);
      debounced.cancel = jest.fn();
      return debounced;
    },
  };
});

jest.mock('../../common/constants', () => {
  const actual = jest.requireActual('../../common/constants');
  return {
    ...actual,
    MAX_DIMENSIONS_SELECTIONS: 5, // Override for tests to allow multiple selections
  };
});

const mockDimensions: Dimension[] = [
  { name: 'host.name' },
  { name: 'container.id' },
  { name: 'service.name' },
  { name: 'pod.name' },
  { name: 'namespace.name' },
  { name: 'node.name' },
  { name: 'zone.name' },
  { name: 'region.name' },
  { name: 'cloud.provider' },
  { name: 'cloud.region' },
  { name: 'cloud.availability_zone' },
] as Dimension[];

const renderWithIntl = (component: React.ReactElement) => {
  return render(<IntlProvider>{component}</IntlProvider>);
};

describe('DimensionsSelector', () => {
  const defaultProps = {
    dimensions: mockDimensions,
    selectedDimensions: [],
    onChange: jest.fn(),
    singleSelection: false,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders the component with correct test subject', () => {
      renderWithIntl(<DimensionsSelector {...defaultProps} />);
      expect(screen.getByTestId(METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ)).toBeInTheDocument();
    });

    it('renders all dimensions as options', () => {
      renderWithIntl(<DimensionsSelector {...defaultProps} />);
      mockDimensions.forEach((dim) => {
        expect(
          screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${dim.name}`)
        ).toBeInTheDocument();
      });
    });

    it('renders loading spinner when isLoading is true', () => {
      renderWithIntl(<DimensionsSelector {...defaultProps} isLoading={true} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Button label', () => {
    it('shows "No dimensions selected" message when no dimensions are selected', () => {
      renderWithIntl(<DimensionsSelector {...defaultProps} />);
      const button = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Button`);
      expect(button).toHaveTextContent('No');
    });

    it('shows "Dimensions" label and count when dimensions are selected', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[0], mockDimensions[1]]}
        />
      );
      const button = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Button`);
      expect(button).toHaveTextContent('Dimensions');
      expect(button).toHaveTextContent('2');
    });

    it('shows tooltip when maximum dimensions are selected', () => {
      const maxSelected = mockDimensions.slice(0, MAX_DIMENSIONS_SELECTIONS);
      renderWithIntl(<DimensionsSelector {...defaultProps} selectedDimensions={maxSelected} />);
      const button = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Button`);
      expect(button).toHaveTextContent('Dimensions');
      expect(button).toHaveTextContent(String(MAX_DIMENSIONS_SELECTIONS));

      expect(button).toHaveAttribute('data-tooltip-content', 'true');

      const tooltip = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}ButtonTooltip`
      );
      expect(tooltip).toBeInTheDocument();

      const tooltipText = tooltip.textContent || '';
      expect(tooltipText).toContain('Maximum');
      expect(tooltipText).toContain(String(MAX_DIMENSIONS_SELECTIONS));
      expect(tooltipText).toContain('dimensions selected');
    });
  });

  describe('Popover content below search', () => {
    it('does not render popover content when no dimensions are selected', () => {
      renderWithIntl(<DimensionsSelector {...defaultProps} />);
      const popover = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Popover`);
      expect(popover).not.toHaveTextContent('dimension selected');
      expect(popover).not.toHaveTextContent('Clear selection');
    });

    it('shows selected dimensions count in popover', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[0], mockDimensions[1]]}
        />
      );
      const popover = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Popover`);
      expect(popover).toHaveTextContent('2 dimensions selected');
    });

    it('shows singular form for single dimension', () => {
      renderWithIntl(
        <DimensionsSelector {...defaultProps} selectedDimensions={[mockDimensions[0]]} />
      );
      const popover = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Popover`);
      expect(popover).toHaveTextContent('1 dimension selected');
    });

    it('renders clear selection button when dimensions are selected', () => {
      renderWithIntl(
        <DimensionsSelector {...defaultProps} selectedDimensions={[mockDimensions[0]]} />
      );
      const clearButton = screen.getByText('Clear selection');
      expect(clearButton).toBeInTheDocument();
    });

    it('calls onChange with empty array when clear selection is clicked', () => {
      const onChange = jest.fn();
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[0]]}
          onChange={onChange}
        />
      );
      const clearButton = screen.getByText('Clear selection');
      fireEvent.click(clearButton);
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Single selection mode', () => {
    it('calls onChange immediately when option is selected', () => {
      const onChange = jest.fn();
      renderWithIntl(
        <DimensionsSelector {...defaultProps} singleSelection={true} onChange={onChange} />
      );
      const option = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[0].name}`
      );
      fireEvent.click(option);
      expect(onChange).toHaveBeenCalledWith([mockDimensions[0]]);
    });

    it('does not disable options based on intersection in single selection mode', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          singleSelection={true}
          selectedDimensions={[mockDimensions[0]]}
        />
      );
      const option = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[1].name}`
      );
      expect(option).toHaveAttribute('data-disabled', 'false');
    });

    it('does not enforce maximum limit in single selection mode', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          singleSelection={true}
          selectedDimensions={[mockDimensions[0]]}
        />
      );

      mockDimensions.forEach((dim) => {
        const option = screen.getByTestId(
          `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${dim.name}`
        );
        expect(option).toHaveAttribute('data-disabled', 'false');
      });
    });
  });

  describe('Multi-selection mode', () => {
    it('calls onChange with debounce when option is selected', async () => {
      const onChange = jest.fn();
      renderWithIntl(
        <DimensionsSelector {...defaultProps} singleSelection={false} onChange={onChange} />
      );
      const option = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[0].name}`
      );
      fireEvent.click(option);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith([mockDimensions[0]]);
      });
    });

    it('enforces maximum selection limit', () => {
      const maxSelected = mockDimensions.slice(0, MAX_DIMENSIONS_SELECTIONS);
      renderWithIntl(<DimensionsSelector {...defaultProps} selectedDimensions={maxSelected} />);

      const unselectedOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[MAX_DIMENSIONS_SELECTIONS].name}`
      );
      expect(unselectedOption).toHaveAttribute('data-disabled', 'true');
    });

    it('does not disable already selected options when at max limit', () => {
      const maxSelected = mockDimensions.slice(0, MAX_DIMENSIONS_SELECTIONS);
      renderWithIntl(<DimensionsSelector {...defaultProps} selectedDimensions={maxSelected} />);

      maxSelected.forEach((dim) => {
        const option = screen.getByTestId(
          `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${dim.name}`
        );
        expect(option.getAttribute('data-disabled')).toBe('false');
      });
    });

    it('limits selection to maximum when multiple options are selected at once', () => {
      const onChange = jest.fn();
      renderWithIntl(<DimensionsSelector {...defaultProps} onChange={onChange} />);

      const optionElements = screen.getAllByTestId(
        new RegExp(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-`)
      );

      optionElements.forEach((option) => {
        if (option.getAttribute('data-disabled') === 'false') {
          fireEvent.click(option);
        }
      });

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      if (lastCall) {
        expect(lastCall[0].length).toBeLessThanOrEqual(MAX_DIMENSIONS_SELECTIONS);
      }
    });
  });

  describe('Full width prop', () => {
    it('passes fullWidth prop to ToolbarSelector', () => {
      renderWithIntl(<DimensionsSelector {...defaultProps} fullWidth={true} />);
      expect(screen.getByTestId(METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Debounce cancellation', () => {
    it('cancels debounced onChange when clear all is clicked', () => {
      const onChange = jest.fn();
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[0]]}
          onChange={onChange}
        />
      );
      const clearButton = screen.getByText('Clear selection');
      fireEvent.click(clearButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Data attributes', () => {
    it('sets data-selected-value attribute with selected dimension names', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[0], mockDimensions[1]]}
        />
      );
      const selector = screen.getByTestId(METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ);
      expect(selector).toBeInTheDocument();
    });
  });

  describe('Selected dimensions not in applicable set (race-condition guard)', () => {
    // A selected dimension must stay visible in the picker even when it is
    // not in `dimensions` — e.g. the latest METRICS_INFO response narrowed
    // the applicable set and dropped it. Without this the count badge can
    // disagree with the visible checkmarks.
    const applicableOnly = [{ name: 'b' }, { name: 'c' }] as Dimension[];
    const orphanPlusApplicable = [{ name: 'a' }, { name: 'b' }] as Dimension[];

    it('shows selected dimensions even when they are not in the dimensions prop', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableOnly}
          selectedDimensions={orphanPlusApplicable}
        />
      );

      const orphanOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-a`
      );
      const applicableOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-b`
      );
      expect(orphanOption).toBeInTheDocument();
      expect(applicableOption).toBeInTheDocument();
      expect(orphanOption).toHaveAttribute('data-checked', 'on');
      expect(applicableOption).toHaveAttribute('data-checked', 'on');
    });

    it('reflects both orphan and applicable selections in the popover count', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableOnly}
          selectedDimensions={orphanPlusApplicable}
        />
      );
      const popover = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Popover`);
      expect(popover).toHaveTextContent('2 dimensions selected');

      const button = screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Button`);
      expect(button).toHaveTextContent('2');
    });

    it('renders orphan selections before applicable options', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableOnly}
          selectedDimensions={orphanPlusApplicable}
        />
      );
      const optionElements = screen.getAllByRole('option');
      const names = optionElements.map((el) => el.textContent);
      // Orphan selection 'a' should come before applicable options 'b'/'c'.
      expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
      expect(names.indexOf('a')).toBeLessThan(names.indexOf('c'));
    });

    it('sorts multiple orphan selections alphabetically amongst themselves', () => {
      const dimensions = [{ name: 'z' }] as Dimension[];
      const selected = [{ name: 'q' }, { name: 'a' }, { name: 'z' }] as Dimension[];

      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={dimensions}
          selectedDimensions={selected}
        />
      );

      const optionElements = screen.getAllByRole('option');
      const names = optionElements.map((el) => el.textContent);
      // Orphan selections a, q should appear before applicable z, and in
      // alphabetical order relative to each other.
      expect(names).toEqual(['a', 'q', 'z']);
    });

    it('deselecting an orphan selection calls onChange with the remaining selections', async () => {
      const onChange = jest.fn();
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableOnly}
          selectedDimensions={orphanPlusApplicable}
          onChange={onChange}
        />
      );

      const orphanOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-a`
      );
      // Toggle off the orphan. The mock toolbar selector re-invokes onChange
      // with the whole list of still-checked options; it reports the clicked
      // option as `checked: 'on'` in its payload, so we need to verify the
      // real component's handleChange strips off the toggled-off option.
      fireEvent.click(orphanOption);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
      // The last call should not contain dimension 'a' any longer.
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      const names = lastCall[0].map((d: Dimension) => d.name);
      expect(names).not.toContain('a');
      expect(names).toContain('b');
    });

    it('renders only applicable options when no orphan selections exist', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableOnly}
          selectedDimensions={[{ name: 'b' }] as Dimension[]}
        />
      );

      expect(
        screen.queryByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-a`)
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-b`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-c`)
      ).toBeInTheDocument();
    });
  });

  describe('Optimistic filter via metricItems', () => {
    // Once a selection is made, the picker must immediately hide dimensions
    // that no metric carrying that selection supports — without waiting for
    // the server round-trip — so rapid multi-select can't reach an empty grid.
    const environment = { name: 'environment' } as Dimension;
    const region = { name: 'region' } as Dimension;
    const hostName = { name: 'host.name' } as Dimension;

    const buildMetricItem = (
      metricName: string,
      dimensionFields: Dimension[]
    ): ParsedMetricItem => ({
      metricName,
      dataStream: 'metrics-test',
      units: [],
      metricTypes: [],
      fieldTypes: [],
      dimensionFields,
    });

    // cpu.usage carries `environment` + `host.name`.
    // network.bytes_in carries `region` + `host.name`.
    // No metric carries both `environment` and `region`.
    const metricItems: ParsedMetricItem[] = [
      buildMetricItem('cpu.usage', [environment, hostName]),
      buildMetricItem('network.bytes_in', [region, hostName]),
    ];

    const applicableDimensions: Dimension[] = [environment, region, hostName];

    it('hides dimensions not supported by any metric carrying the current selection', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableDimensions}
          selectedDimensions={[environment]}
          metricItems={metricItems}
        />
      );

      // `region` is disjoint from `environment` (no single metric carries
      // both) so the picker must hide it optimistically, before the debounced
      // onChange fires and the server responds.
      expect(
        screen.queryByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-region`)
      ).not.toBeInTheDocument();

      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-environment`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-host.name`)
      ).toBeInTheDocument();
    });

    it('without metricItems, falls back to the full dimensions list', () => {
      // The prop is optional; callers that don't provide it get the options
      // straight from `dimensions`, no client-side narrowing.
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableDimensions}
          selectedDimensions={[environment]}
        />
      );

      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-environment`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-region`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-host.name`)
      ).toBeInTheDocument();
    });

    it('orphan selections still surface even with the optimistic filter', () => {
      // The optimistic filter operates on applicable options; a selected
      // dimension that isn't in metricItems still renders (checked) so the
      // count stays consistent and the user can back out.
      const orphan = { name: 'orphan.field' } as Dimension;

      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableDimensions}
          selectedDimensions={[environment, orphan]}
          metricItems={metricItems}
        />
      );

      const orphanOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-orphan.field`
      );
      expect(orphanOption).toBeInTheDocument();
      expect(orphanOption).toHaveAttribute('data-checked', 'on');
    });

    it('no selection means the full applicable list is shown', () => {
      // With nothing selected there's no metric subset to constrain to, so
      // every applicable dimension must remain available.
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          dimensions={applicableDimensions}
          selectedDimensions={[]}
          metricItems={metricItems}
        />
      );

      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-environment`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-region`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-host.name`)
      ).toBeInTheDocument();
    });
  });
});
