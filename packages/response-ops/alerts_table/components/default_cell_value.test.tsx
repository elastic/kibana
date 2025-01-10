/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps } from 'react';
import {
  ALERT_DURATION,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_START,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { screen, render } from '@testing-library/react';
import { DefaultCellValue } from './default_cell_value';
import { createPartialObjectMock } from '../utils/test';
import { CellComponentProps } from '../types';
import { mockRenderContext } from '../mocks/context.mock';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';

const props = createPartialObjectMock<CellComponentProps>({
  ...mockRenderContext,
  alert: mockRenderContext.alerts[0],
});

const TestComponent = (_props: ComponentProps<typeof DefaultCellValue>) => (
  <AlertsTableContextProvider value={mockRenderContext}>
    <DefaultCellValue {..._props} />
  </AlertsTableContextProvider>
);

describe('DefaultCellValue', () => {
  it.each([TIMESTAMP, ALERT_START])('should format date fields', (columnId) => {
    render(<TestComponent {...props} columnId={columnId} />);
    expect(mockRenderContext.services.fieldFormats.deserialize).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'date',
      })
    );
  });

  it('should render the rule name as a link', () => {
    render(<TestComponent {...props} columnId={ALERT_RULE_NAME} />);
    expect(screen.queryByRole('link')).toBeInTheDocument();
  });

  it('should render the alert duration in milliseconds', () => {
    render(<TestComponent {...props} columnId={ALERT_DURATION} />);
    expect(mockRenderContext.services.fieldFormats.deserialize).toHaveBeenCalledWith({
      id: 'duration',
      params: {
        inputFormat: 'microseconds',
        outputFormat: 'humanizePrecise',
      },
    });
  });

  describe('in the rule consumer column', () => {
    it('should show "observability" for any observability producer', () => {
      render(
        <TestComponent
          {...props}
          columnId={ALERT_RULE_CONSUMER}
          alert={{
            ...props.alert,
            [ALERT_RULE_PRODUCER]: ['logs'],
          }}
        />
      );
      expect(screen.queryByText('Observability')).toBeInTheDocument();
    });

    it.each(['alerts', 'stackAlerts', 'discover'])(
      'should show the producer when the consumer is %s',
      (consumer) => {
        render(
          <TestComponent
            {...props}
            columnId={ALERT_RULE_CONSUMER}
            alert={{
              ...props.alert,
              [ALERT_RULE_PRODUCER]: ['ml'],
              [ALERT_RULE_CONSUMER]: [consumer],
            }}
          />
        );
        expect(screen.queryByText('Machine Learning')).toBeInTheDocument();
      }
    );
  });

  it('else should show the consumer', () => {
    render(
      <TestComponent
        {...props}
        columnId={ALERT_RULE_CONSUMER}
        alert={{
          ...props.alert,
          [ALERT_RULE_PRODUCER]: ['test-producer'],
          [ALERT_RULE_CONSUMER]: ['test-consumer'],
        }}
      />
    );
    expect(screen.queryByText('test-consumer')).toBeInTheDocument();
  });
});
