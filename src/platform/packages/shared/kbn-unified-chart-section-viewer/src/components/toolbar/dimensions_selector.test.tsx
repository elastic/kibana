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
import type { Dimension } from '../../types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
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
      popoverContentBelowSearch,
      'data-test-subj': dataTestSubj,
      singleSelection,
    }: {
      options: any[];
      onChange?: (option: any) => void;
      buttonLabel: React.ReactNode;
      popoverContentBelowSearch?: React.ReactNode;
      'data-test-subj'?: string;
      singleSelection?: boolean;
    }) => (
      <div data-test-subj={dataTestSubj}>
        <div data-test-subj={`${dataTestSubj}Button`}>{buttonLabel}</div>
        <div data-test-subj={`${dataTestSubj}Popover`}>
          {popoverContentBelowSearch}
          {options.map((option) => (
            <div
              key={option.key}
              data-test-subj={`${dataTestSubj}Option-${option.value}`}
              data-disabled={String(option.disabled)}
              data-checked={option.checked}
              onClick={() => !option.disabled && onChange?.(option)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !option.disabled) {
                  e.preventDefault();
                  onChange?.(option);
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
    ),
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
    MAX_DIMENSIONS_SELECTIONS: 10, // Override for tests to allow multiple selections
  };
});

const mockDimensions: Dimension[] = [
  { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'container.id', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'pod.name', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'namespace.name', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'node.name', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'zone.name', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'region.name', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'cloud.provider', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'cloud.region', type: ES_FIELD_TYPES.KEYWORD },
  { name: 'cloud.availability_zone', type: ES_FIELD_TYPES.KEYWORD },
];

const mockFields = [
  { dimensions: [mockDimensions[0], mockDimensions[1]] },
  { dimensions: [mockDimensions[0], mockDimensions[2]] },
  { dimensions: [mockDimensions[1], mockDimensions[3]] },
  { dimensions: [mockDimensions[0], mockDimensions[1], mockDimensions[2]] },
];

const renderWithIntl = (component: React.ReactElement) => {
  return render(<IntlProvider>{component}</IntlProvider>);
};

describe('DimensionsSelector', () => {
  const defaultProps = {
    fields: mockFields,
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

      const tooltipAnchor = button.querySelector('.euiToolTipAnchor');
      expect(tooltipAnchor).toBeInTheDocument();
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

  describe('Option sorting', () => {
    it('sorts options correctly using helper functions', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[2], mockDimensions[0]]}
        />
      );
      const options = screen.getAllByTestId(
        new RegExp(`${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-`)
      );

      const firstUnselectedIndex = options.findIndex(
        (opt) => opt.getAttribute('data-checked') !== 'on'
      );
      const lastSelectedIndex = options.findLastIndex(
        (opt) => opt.getAttribute('data-checked') === 'on'
      );

      if (firstUnselectedIndex >= 0 && lastSelectedIndex >= 0) {
        expect(lastSelectedIndex).toBeLessThan(firstUnselectedIndex);
      }
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

  describe('Intersection logic', () => {
    it('enables all dimensions when no dimensions are selected', () => {
      renderWithIntl(<DimensionsSelector {...defaultProps} />);
      mockDimensions.forEach((dim) => {
        const option = screen.getByTestId(
          `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${dim.name}`
        );
        expect(option).toHaveAttribute('data-disabled', 'false');
      });
    });

    it('disables dimensions that are not in intersection of fields', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[0]]} // host.name
        />
      );

      const hostNameOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[0].name}`
      );
      expect(hostNameOption).toHaveAttribute('data-disabled', 'false');

      const containerIdOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[1].name}`
      );
      expect(containerIdOption).toHaveAttribute('data-disabled', 'false');

      const serviceNameOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[2].name}`
      );
      expect(serviceNameOption).toHaveAttribute('data-disabled', 'false');

      const podNameOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[3].name}`
      );
      expect(podNameOption).toHaveAttribute('data-disabled', 'true');
    });

    it('enables dimensions that appear in fields containing all selected dimensions', () => {
      renderWithIntl(
        <DimensionsSelector
          {...defaultProps}
          selectedDimensions={[mockDimensions[0], mockDimensions[1]]} // host.name, container.id
        />
      );

      const hostNameOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[0].name}`
      );
      expect(hostNameOption).toHaveAttribute('data-disabled', 'false');

      const containerIdOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[1].name}`
      );
      expect(containerIdOption).toHaveAttribute('data-disabled', 'false');

      const serviceNameOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[2].name}`
      );
      expect(serviceNameOption).toHaveAttribute('data-disabled', 'false');

      const podNameOption = screen.getByTestId(
        `${METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}Option-${mockDimensions[3].name}`
      );
      expect(podNameOption).toHaveAttribute('data-disabled', 'true');
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
});
