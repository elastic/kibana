/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxProps } from '@elastic/eui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import type { ConnectorInstance } from '@kbn/workflows';
import { ConnectorIdField } from './connector_id_field';
import { connectorCreated, setConnectors } from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { isCreateConnectorEnabledForStepType } from '../../../shared/lib/connectors_utils';
import type { StepFormField } from '../lib/step_form_schema';

// The real list is virtualized and renders no options in jsdom, so this stands in for it: it shows
// every option, the selection, what the matcher keeps for a search, and the props under test.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const MockReact = jest.requireActual('react');
  const h = MockReact.createElement;
  const FakeComboBox = (props: EuiComboBoxProps<string>) =>
    h(
      'div',
      {
        'data-test-subj': props['data-test-subj'],
        'data-clearable': String(props.isClearable),
        'data-selected': (props.selectedOptions ?? []).map((o) => o.label).join('|'),
      },
      h(
        'ul',
        null,
        (props.options ?? []).map((option) =>
          h(
            'li',
            { key: option.value },
            h(
              'button',
              {
                type: 'button',
                'data-test-subj': `option-${option.value}`,
                onClick: () => props.onChange?.([option]),
              },
              option.label
            ),
            h(
              'span',
              { 'data-test-subj': `matches-typed-${option.value}` },
              String(
                props.optionMatcher?.({
                  option,
                  searchValue: 'zzz',
                  normalizedSearchValue: 'zzz',
                  isCaseSensitive: false,
                }) ?? 'no-matcher'
              )
            ),
            h(
              'span',
              { 'data-test-subj': `matches-empty-${option.value}` },
              String(
                props.optionMatcher?.({
                  option,
                  searchValue: '',
                  normalizedSearchValue: '',
                  isCaseSensitive: false,
                }) ?? 'no-matcher'
              )
            )
          )
        )
      ),
      h('button', {
        type: 'button',
        'data-test-subj': 'clear',
        onClick: () => props.onChange?.([]),
      }),
      h('button', {
        type: 'button',
        'data-test-subj': 'type-custom',
        onClick: () => props.onCreateOption?.('  my-id  ', props.options ?? []),
      }),
      h('button', {
        type: 'button',
        'data-test-subj': 'type-blank',
        onClick: () => props.onCreateOption?.('   ', props.options ?? []),
      })
    );
  return { ...actual, EuiComboBox: FakeComboBox };
});

jest.mock('../../../shared/lib/connectors_utils', () => ({
  ...jest.requireActual('../../../shared/lib/connectors_utils'),
  isCreateConnectorEnabledForStepType: jest.fn(() => true),
}));
const mockCreateEnabled = isCreateConnectorEnabledForStepType as jest.Mock;

const instance = (overrides: Partial<ConnectorInstance> & { id: string; name: string }) => ({
  isPreconfigured: false,
  isDeprecated: false,
  ...overrides,
});

const SLACK_INSTANCES = [
  instance({ id: 'id-prod', name: 'Prod Slack', isPreconfigured: true }),
  instance({ id: 'id-old', name: 'Old Slack', isDeprecated: true }),
  instance({ id: 'id-alpha', name: 'Alpha' }),
];

const connectorField = (overrides: Partial<StepFormField> = {}): StepFormField => ({
  key: 'connector-id',
  path: ['connector-id'],
  label: 'Connector id',
  required: true,
  kind: 'connector-id',
  stepType: 'slack',
  ...overrides,
});

const setup = ({
  field = connectorField(),
  value = '',
  instances = SLACK_INSTANCES,
}: {
  field?: StepFormField;
  value?: unknown;
  instances?: ConnectorInstance[];
} = {}) => {
  const store = createMockStore();
  store.dispatch(
    setConnectors({
      connectorTypes: {
        '.slack': {
          actionTypeId: '.slack',
          displayName: 'Slack',
          instances,
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          subActions: [],
        },
      },
      totalConnectors: instances.length,
    })
  );
  const onChange = jest.fn();
  const view = render(
    <Provider store={store}>
      <ConnectorIdField
        field={field}
        value={value}
        onChange={onChange}
        isInvalid={false}
        onBlur={jest.fn()}
        testSubj="workflowStepConfigField-connector-id"
      />
    </Provider>
  );
  return { store, onChange, ...view };
};

const optionLabels = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('data-test-subj')?.startsWith('option-'))
    .map((button) => button.textContent);

describe('ConnectorIdField', () => {
  beforeEach(() => {
    mockCreateEnabled.mockReturnValue(true);
  });

  it('lists the connectors of the step type as `name • id`, deprecated last, then Create connector', () => {
    setup();

    expect(optionLabels()).toEqual([
      'Alpha • id-alpha',
      'Prod Slack (preconfigured) • id-prod',
      'Old Slack (deprecated) • id-old',
      'Create connector',
    ]);
  });

  it('offers no Create connector entry when creating is disabled for the step', () => {
    mockCreateEnabled.mockReturnValue(false);
    setup();

    expect(optionLabels()).toEqual([
      'Alpha • id-alpha',
      'Prod Slack (preconfigured) • id-prod',
      'Old Slack (deprecated) • id-old',
    ]);
  });

  it('lists only Create connector when the step type has no connectors', () => {
    setup({ instances: [] });

    expect(optionLabels()).toEqual(['Create connector']);
  });

  it('writes the id of the connector that was picked', () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByTestId('option-id-prod'));

    expect(onChange).toHaveBeenCalledWith('id-prod');
  });

  it('accepts any typed text as the value, trimmed, and ignores blank text', () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByTestId('type-custom'));
    expect(onChange).toHaveBeenLastCalledWith('my-id');

    onChange.mockClear();
    fireEvent.click(screen.getByTestId('type-blank'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows Create connector only while nothing is typed, so Enter accepts typed text', () => {
    setup();

    // Nothing typed: every connector and the create entry are listed.
    expect(screen.getByTestId('matches-empty-__workflowsCreateConnector__')).toHaveTextContent(
      'true'
    );
    expect(screen.getByTestId('matches-empty-id-prod')).toHaveTextContent('true');
    // Text typed: the create entry steps aside (it would be the only match and Enter would open the
    // flyout), and the connectors are filtered by name or id.
    expect(screen.getByTestId('matches-typed-__workflowsCreateConnector__')).toHaveTextContent(
      'false'
    );
    expect(screen.getByTestId('matches-typed-id-prod')).toHaveTextContent('false');
  });

  it('shows the label of a known id and the raw text of any other value', () => {
    const known = setup({ value: 'id-prod' });
    expect(screen.getByTestId('workflowStepConfigField-connector-id')).toHaveAttribute(
      'data-selected',
      'Prod Slack (preconfigured) • id-prod'
    );
    known.unmount();

    setup({ value: 'something-else' });
    expect(screen.getByTestId('workflowStepConfigField-connector-id')).toHaveAttribute(
      'data-selected',
      'something-else'
    );
  });

  it('is clearable only when the connector-id is optional, and clearing removes the value', () => {
    const required = setup();
    expect(screen.getByTestId('workflowStepConfigField-connector-id')).toHaveAttribute(
      'data-clearable',
      'false'
    );
    required.unmount();

    const { onChange } = setup({ field: connectorField({ required: false }), value: 'id-prod' });
    expect(screen.getByTestId('workflowStepConfigField-connector-id')).toHaveAttribute(
      'data-clearable',
      'true'
    );
    fireEvent.click(screen.getByTestId('clear'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  describe('Create connector', () => {
    it('opens the create flyout for the action type, with a request id, and writes no value', () => {
      const { store, onChange } = setup();

      fireEvent.click(screen.getByTestId('option-__workflowsCreateConnector__'));

      const flyout = store.getState().detail.connectorFlyout;
      expect(flyout).toMatchObject({ isOpen: true, connectorType: '.slack' });
      expect(flyout.requestId).toEqual(expect.any(String));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('takes the id of the connector created for this field, once', () => {
      const { store, onChange } = setup();
      fireEvent.click(screen.getByTestId('option-__workflowsCreateConnector__'));
      const { requestId } = store.getState().detail.connectorFlyout;

      act(() => {
        store.dispatch(connectorCreated({ requestId: requestId as string, id: 'id-new' }));
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('id-new');
      expect(store.getState().detail.lastCreatedConnector).toBeUndefined();
    });

    it('ignores a connector created for another field', () => {
      const { store, onChange } = setup();

      act(() => {
        store.dispatch(connectorCreated({ requestId: 'another-field', id: 'id-new' }));
      });

      expect(onChange).not.toHaveBeenCalled();
      expect(store.getState().detail.lastCreatedConnector).toEqual({
        requestId: 'another-field',
        id: 'id-new',
      });
    });
  });
});
