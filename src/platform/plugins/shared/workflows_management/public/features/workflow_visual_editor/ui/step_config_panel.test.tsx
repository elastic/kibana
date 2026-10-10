/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConnectorContractUnion } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { resetStepConfigPanelSessionStateForTests, StepConfigPanel } from './step_config_panel';

jest.mock('@kbn/code-editor', () => {
  const MockReact = jest.requireActual('react');
  return {
    CodeEditor: (props: {
      value: string;
      languageId: string;
      onChange?: (
        v: string,
        event?: { changes: Array<{ rangeOffset: number; text: string }> }
      ) => void;
      dataTestSubj?: string;
      'aria-label'?: string;
      placeholder?: string;
      editorDidMount?: (editor: {
        focus: () => void;
        getModel: () => {
          getOffsetAt: (pos: { lineNumber: number; column: number }) => number;
          getPositionAt: (offset: number) => { lineNumber: number; column: number };
          getValueLength: () => number;
        };
        getPosition: () => { lineNumber: number; column: number };
        setPosition: (pos: { lineNumber: number; column: number }) => void;
        revealPosition: (pos: { lineNumber: number; column: number }) => void;
        getValue: () => string;
      }) => void;
    }) => {
      const textareaRef = (
        MockReact.useRef as <T>(val: T | null) => React.MutableRefObject<T | null>
      )<HTMLTextAreaElement>(null);
      MockReact.useEffect(() => {
        props.editorDidMount?.({
          focus: () => textareaRef.current?.focus(),
          getValue: () => props.value,
          getModel: () => ({
            getOffsetAt: () => textareaRef.current?.selectionStart ?? props.value.length,
            getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
            getValueLength: () => props.value.length,
          }),
          getPosition: () => ({
            lineNumber: 1,
            column: (textareaRef.current?.selectionStart ?? props.value.length) + 1,
          }),
          setPosition: (pos: { lineNumber: number; column: number }) => {
            const offset = Math.max(0, pos.column - 1);
            textareaRef.current?.setSelectionRange(offset, offset);
          },
          revealPosition: () => undefined,
        });
      }, [props]);
      return (
        <textarea
          ref={textareaRef}
          data-test-subj={props.dataTestSubj ?? 'mocked-code-editor'}
          data-language={props.languageId}
          aria-label={props['aria-label']}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(e) => {
            const next = e.target.value;
            const caret = e.target.selectionStart ?? next.length;
            props.onChange?.(next, {
              changes: [
                {
                  rangeOffset: caret - (next.length - props.value.length),
                  text: next.slice(Math.max(0, caret - 1), caret),
                },
              ],
            });
          }}
        />
      );
    },
  };
});

jest.mock('@kbn/monaco', () => ({
  XJSON_LANG_ID: 'xjson',
  YAML_LANG_ID: 'yaml',
  ESQL_LANG_ID: 'esql',
}));

jest.mock('@kbn/esql-editor', () => {
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({
      query,
      onTextLangQueryChange,
    }: {
      query: { esql: string };
      onTextLangQueryChange: (q: { esql: string }) => void;
    }) =>
      MockReact.createElement('textarea', {
        'data-test-subj': 'mocked-esql-editor',
        value: query?.esql ?? '',
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onTextLangQueryChange({ esql: e.target.value }),
      }),
  };
});
jest.mock('@kbn/workflows-ui', () => ({
  WORKFLOWS_MONACO_EDITOR_THEME: 'theme',
  ensureWorkflowGraphEuiIcons: jest.fn(),
  resolveNodeChipStyle: () => ({
    background: 'bg',
    border: 'border',
    iconColor: 'icon',
    isBrand: false,
  }),
  stepSupportsErrorHandling: (stepType: string | undefined) =>
    Boolean(
      stepType && !['if', 'foreach', 'parallel', 'while', 'merge', 'atomic'].includes(stepType)
    ),
}));
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="mocked-step-icon" />,
}));

jest.mock('../../actions_menu_popover', () => ({
  ActionsMenu: ({ rootTitle, onClose }: { rootTitle?: string; onClose?: () => void }) => (
    <div data-test-subj="actionsMenuCompact">
      <span>{rootTitle}</span>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

const connectors: ConnectorContractUnion[] = [
  {
    type: 'slack',
    hasConnectorId: 'required',
    paramsSchema: z.object({
      message: z.string(),
      query: z.record(z.string(), z.unknown()).optional(),
    }),
    outputSchema: z.unknown(),
    summary: 'Slack',
    description: null,
  } as unknown as ConnectorContractUnion,
];

const FRAGMENT = `name: notify # step comment
type: slack
connector-id: abc
x-owner: team-a
with:
  message: "Hi {{ inputs.user }}"
  # trailing comment
`;

const renderPanel = (overrides: Partial<React.ComponentProps<typeof StepConfigPanel>> = {}) => {
  const onClose = jest.fn();
  const onRevert = jest.fn();
  const onFragmentChange = jest.fn();
  const view = render(
    <I18nProvider>
      <StepConfigPanel
        mode="edit"
        stepType="slack"
        initialFragment={FRAGMENT}
        connectors={connectors}
        onClose={onClose}
        onRevert={onRevert}
        onFragmentChange={onFragmentChange}
        {...overrides}
      />
    </I18nProvider>
  );
  return { onClose, onRevert, onFragmentChange, unmount: view.unmount };
};

const expandSettingsAccordion = () => {
  const accordion = screen.getByTestId('workflowStepConfigPanelAccordion-settings');
  const trigger = accordion.querySelector('button');
  if (!trigger) {
    throw new Error('Settings accordion trigger not found');
  }
  fireEvent.click(trigger);
};

describe('StepConfigPanel', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
  });
  it('renders instance name as title without a catalog · type subtitle', () => {
    renderPanel();
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('notify');
    expect(screen.queryByTestId('workflowStepConfigPanelSubtitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigPanelCatalog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigPanelType')).not.toBeInTheDocument();
    expect(screen.queryByText(/Configure/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigField-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.message')).toHaveValue(
      'Hi {{ inputs.user }}'
    );
    // Humanized labels — not raw YAML keys. Name lives in the header only.
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
    expect(screen.getByText('Connector id')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    // Uncurated optionals stay behind "Add optional field" until chosen.
    expect(screen.queryByTestId('workflowStepConfigField-with.query')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigAddOptionalField')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-with.query'));
    expect(screen.getByTestId('workflowStepConfigField-with.query')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigRemoveOptional-with.query')).toBeInTheDocument();
    const settingsAccordion = screen.getByTestId('workflowStepConfigPanelAccordion-settings');
    expect(settingsAccordion).not.toHaveClass('euiAccordion-isOpen');
    expandSettingsAccordion();
    expect(settingsAccordion).toHaveClass('euiAccordion-isOpen');
    expect(screen.getByTestId('workflowStepConfigErrorHandlingSection')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelAccordion-inputs')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigConfiguration')).not.toBeInTheDocument();
    // Casing-only labels skip the YAML-key hint.
    expect(screen.queryByTestId('workflowStepConfigFieldKey-with.message')).not.toBeInTheDocument();
    // query is a JSON code field; message is a plain text field.
    expect(screen.getByTestId('workflowStepConfigField-with.query')).toHaveAttribute(
      'data-language',
      'json'
    );
    // Reference-capable text inputs get an enabled "@" affordance.
    for (const affordance of screen.getAllByTestId('workflowStepConfigDataReference')) {
      expect(affordance).toBeEnabled();
    }
  });

  it('uses the catalog display name as the title when inserting before a name exists', () => {
    renderPanel({
      mode: 'insert',
      actionLabel: 'Slack Message',
      initialFragment: 'type: slack\nconnector-id: abc\nwith:\n  message: hi\n',
    });
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('Slack Message');
    expect(screen.queryByTestId('workflowStepConfigPanelSubtitle')).not.toBeInTheDocument();
  });

  it('edits the step name inline in the header', () => {
    renderPanel();
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('notify');
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelTitle'));
    const input = screen.getByTestId('workflowStepConfigPanelNameInput');
    fireEvent.change(input, { target: { value: 'Close Alert False Positive' } });
    expect(input).toHaveValue('Close Alert False Positive');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent(
      'Close Alert False Positive'
    );
  });

  it('reverts header name edits on Escape and rejects empty names', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelTitle'));
    const input = screen.getByTestId('workflowStepConfigPanelNameInput');
    fireEvent.change(input, { target: { value: 'temp' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('notify');

    fireEvent.click(screen.getByTestId('workflowStepConfigPanelTitle'));
    const again = screen.getByTestId('workflowStepConfigPanelNameInput');
    fireEvent.change(again, { target: { value: '   ' } });
    fireEvent.keyDown(again, { key: 'Enter' });
    expect(screen.getByTestId('workflowStepConfigPanelNameError')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelNameInput')).toBeInTheDocument();
  });

  it('prettifies types that lack a catalog display name for the insert title fallback', () => {
    const bareConnectors: ConnectorContractUnion[] = [
      {
        type: 'kibana.createCaseDefaultSpace',
        hasConnectorId: false,
        paramsSchema: z.object({ title: z.string() }),
        outputSchema: z.unknown(),
        summary: null,
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    renderPanel({
      mode: 'insert',
      stepType: 'kibana.createCaseDefaultSpace',
      connectors: bareConnectors,
      initialFragment: 'type: kibana.createCaseDefaultSpace\nwith:\n  title: t\n',
    });
    // No instance name yet — title falls back to the prettified catalog label.
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent(
      'Create case default space'
    );
    expect(screen.queryByTestId('workflowStepConfigPanelSubtitle')).not.toBeInTheDocument();
  });

  it('shows a YAML-key hint only when the label diverges from the key', () => {
    const metaConnectors: ConnectorContractUnion[] = [
      {
        type: 'hash',
        hasConnectorId: false,
        paramsSchema: z.object({
          hash: z.string().meta({ title: 'File hash' }),
          failOnError: z.boolean().optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'Hash',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    renderPanel({
      stepType: 'hash',
      connectors: metaConnectors,
      initialFragment: 'name: h\ntype: hash\nwith:\n  hash: abc\n',
    });
    expect(screen.getByText('File hash')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigFieldKey-with.hash')).toHaveTextContent('hash');
    // Uncurated optional → Add optional field picker.
    expect(screen.queryByText('Fail on error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-with.failOnError'));
    expect(screen.getByText('Fail on error')).toBeInTheDocument();
    expect(
      screen.queryByTestId('workflowStepConfigFieldKey-with.failOnError')
    ).not.toBeInTheDocument();
  });

  it('auto-reveals optional fields that already have values; others stay in the picker', () => {
    const requestConnectors: ConnectorContractUnion[] = [
      {
        type: 'kibana.request',
        hasConnectorId: false,
        paramsSchema: z.object({
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
          path: z.string(),
          body: z.record(z.string(), z.unknown()).optional(),
          headers: z.record(z.string(), z.unknown()).optional(),
          query: z.record(z.string(), z.unknown()).optional(),
          form_data: z.record(z.string(), z.unknown()).optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'Kibana Request',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const fragment = `name: req
type: kibana.request
with:
  method: GET
  path: /api/foo
  body:
    ok: true
  query:
    q: "1"
`;
    render(
      <I18nProvider>
        <StepConfigPanel
          mode="insert"
          stepType="kibana.request"
          actionLabel="Kibana Request"
          initialFragment={fragment}
          connectors={requestConnectors}
          onClose={jest.fn()}
          onRevert={jest.fn()}
        />
      </I18nProvider>
    );

    // Promoted / required fields stay inline.
    expect(screen.queryByTestId('workflowStepConfigField-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.method')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.path')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.body')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.headers')).toBeInTheDocument();

    // Valued optional query is auto-revealed; empty form_data stays in the picker.
    expect(screen.getByTestId('workflowStepConfigField-with.query')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigField-with.form_data')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-with.form_data'));
    expect(screen.getByTestId('workflowStepConfigField-with.form_data')).toBeInTheDocument();
  });

  it('keeps http primary fields inline and optional keys behind Add optional field', () => {
    const httpConnectors: ConnectorContractUnion[] = [
      {
        type: 'http',
        hasConnectorId: false,
        paramsSchema: z.object({
          url: z.string().optional(),
          method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
          headers: z.record(z.string(), z.unknown()).optional(),
          body: z.unknown().optional(),
          path: z.string().optional(),
          query: z.record(z.string(), z.unknown()).optional(),
          form_data: z.record(z.string(), z.unknown()).optional(),
          fetcher: z.string().optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'HTTP Request',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    renderPanel({
      stepType: 'http',
      connectors: httpConnectors,
      initialFragment:
        'name: call\ntype: http\nwith:\n  url: https://example.com\n  method: GET\n  path: /v1\n',
    });
    expect(screen.getByTestId('workflowStepConfigField-with.url')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.method')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.headers')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.body')).toBeInTheDocument();
    // path already has a value → auto-revealed; other optionals stay in the picker.
    expect(screen.getByTestId('workflowStepConfigField-with.path')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigAddOptionalField')).toBeInTheDocument();

    // Optional stays flush-right on both promoted and picker-added fields; ✕ is hover/focus.
    const urlRow = screen.getByTestId('workflowStepConfigField-with.url').closest('.euiFormRow');
    expect(urlRow).toHaveTextContent('Optional');
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-with.query'));
    const queryRow = screen
      .getByTestId('workflowStepConfigField-with.query')
      .closest('.euiFormRow');
    expect(queryRow).toHaveTextContent('Optional');
    expect(screen.getByTestId('workflowStepConfigRemoveOptional-with.query')).toBeInTheDocument();
  });

  it('puts uncurated optionals behind Add optional field unless valued', () => {
    renderPanel({
      initialFragment:
        'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n  query:\n    q: "1"\n',
    });
    // Valued query auto-reveals; Settings accordion holds error handling when opened.
    expect(screen.getByTestId('workflowStepConfigField-with.query')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPrimaryFields')).toBeInTheDocument();
    expandSettingsAccordion();
    expect(screen.getByTestId('workflowStepConfigErrorHandlingSection')).toBeInTheDocument();
  });

  it('renders a plain form with no error handling when the step is ineligible', () => {
    renderPanel({
      stepType: 'if',
      initialFragment: 'name: branch\ntype: if\ncondition: "true"\n',
      connectors: [],
      isFallbackStep: false,
    });
    expect(screen.queryByTestId('workflowStepConfigConfiguration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigAddOptionalField')).not.toBeInTheDocument();
    expandSettingsAccordion();
    expect(screen.queryByTestId('workflowStepConfigErrorHandlingSection')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelSettings')).toBeInTheDocument();
  });

  it('writes retry and continue through on-failure and clears keys when toggled off', () => {
    renderPanel({
      initialFragment: 'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n',
    });
    expandSettingsAccordion();
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorRetry'));
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorContinue'));
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelView-yaml'));
    const yaml = (screen.getByTestId('workflowStepConfigPanelYaml') as HTMLTextAreaElement).value;
    expect(yaml).toContain('on-failure:');
    expect(yaml).toContain('max-attempts: 3');
    expect(yaml).toContain('delay: 5s');
    expect(yaml).toContain('continue: true');

    fireEvent.click(screen.getByTestId('workflowStepConfigPanelView-form'));
    // Page-session remembers Settings stayed open across the YAML round-trip.
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorRetry'));
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorContinue'));
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelView-yaml'));
    const cleared = (screen.getByTestId('workflowStepConfigPanelYaml') as HTMLTextAreaElement)
      .value;
    expect(cleared).not.toContain('on-failure');
  });

  it('hides Error handling for fallback steps', () => {
    const { unmount } = render(
      <I18nProvider>
        <StepConfigPanel
          mode="edit"
          stepType="slack"
          initialFragment="name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n"
          connectors={connectors}
          onClose={jest.fn()}
          onRevert={jest.fn()}
          isFallbackStep
        />
      </I18nProvider>
    );
    expandSettingsAccordion();
    expect(screen.queryByTestId('workflowStepConfigErrorHandlingSection')).not.toBeInTheDocument();
    unmount();

    renderPanel({
      initialFragment: 'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n',
    });
    expandSettingsAccordion();
    expect(screen.getByTestId('workflowStepConfigErrorHandlingSection')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigErrorFallback')).not.toBeInTheDocument();
  });

  it('round-trips Form → YAML preserving comments, unknown keys and Liquid; live-applies via onFragmentChange', () => {
    const { onFragmentChange } = renderPanel();
    fireEvent.change(screen.getByTestId('workflowStepConfigField-with.message'), {
      target: { value: 'Changed {{ inputs.user }}' },
    });
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelView-yaml'));
    const yaml = (screen.getByTestId('workflowStepConfigPanelYaml') as HTMLTextAreaElement).value;
    expect(yaml).toContain('# step comment');
    expect(yaml).toContain('x-owner: team-a');
    expect(yaml).toContain('# trailing comment');
    expect(yaml).toContain('Changed {{ inputs.user }}');
    expect(yaml).toContain('connector-id: abc');

    // No Done button — every draft change live-applies through onFragmentChange.
    expect(onFragmentChange).toHaveBeenLastCalledWith(yaml);
  });

  it('shows values the form cannot represent as read-only "Defined in YAML"', () => {
    renderPanel({
      initialFragment:
        'name: n\ntype: slack\nconnector-id: a\nwith:\n  message:\n    nested: true\n',
    });
    expect(screen.getByTestId('workflowStepConfigField-with.message-readonly')).toHaveAttribute(
      'readonly'
    );
    expect(screen.getByText('Defined in YAML')).toBeInTheDocument();
  });

  it('validates on blur; incomplete/misconfigured edits still live-apply (no Done gate)', () => {
    const { onFragmentChange } = renderPanel({
      initialFragment: 'name: n\ntype: slack\nconnector-id: abc\nwith: {}\n',
    });
    const messageInput = screen.getByTestId('workflowStepConfigField-with.message');
    expect(messageInput).not.toHaveAttribute('aria-invalid', 'true');

    // Mid-typing an empty required field does not accuse, and still live-applies
    // (incomplete state is apply-able — the canvas badge reflects it).
    fireEvent.change(messageInput, { target: { value: '' } });
    expect(messageInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Message is required')).not.toBeInTheDocument();
    expect(onFragmentChange).toHaveBeenCalled();

    fireEvent.blur(messageInput);
    expect(messageInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Message is required')).toBeInTheDocument();

    // Fast forgiveness once already invalid.
    fireEvent.change(messageInput, { target: { value: 'hello' } });
    expect(messageInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Message is required')).not.toBeInTheDocument();

    // Misconfigured values (e.g. unclosed template) still live-apply — the
    // canvas badge reflects them; the panel never gates on advisory errors.
    fireEvent.change(messageInput, { target: { value: 'Hi {{ inputs.x' } });
    expect(onFragmentChange).toHaveBeenLastCalledWith(expect.stringContaining('Hi {{ inputs.x'));
  });

  it('renders compact boolean rows with label and switch on one line', () => {
    const boolConnectors: ConnectorContractUnion[] = [
      {
        type: 'toggle',
        hasConnectorId: false,
        paramsSchema: z.object({
          debug: z.boolean().optional().describe('Include debug output'),
        }),
        outputSchema: z.unknown(),
        summary: 'Toggle',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    renderPanel({
      stepType: 'toggle',
      connectors: boolConnectors,
      initialFragment: 'name: t\ntype: toggle\nwith:\n  debug: true\n',
    });
    // Valued optional boolean auto-reveals.
    const switchEl = screen.getByTestId('workflowStepConfigField-with.debug');
    const row = screen.getByTestId('workflowStepConfigField-with.debug-row');
    expect(row).toContainElement(switchEl);
    expect(row).toHaveTextContent('Debug');
    // Auto-revealed optionals keep Optional + a hover/focus ✕ remove control.
    expect(row).toHaveTextContent('Optional');
    expect(screen.getByTestId('workflowStepConfigRemoveOptional-with.debug')).toBeInTheDocument();
    expect(row).toHaveTextContent('Include debug output');
    // Switch is not alone on a stacked field row — label is associated via htmlFor.
    expect(switchEl).toHaveAttribute('id');
    const label = row.querySelector(`label[for="${switchEl.getAttribute('id')}"]`);
    expect(label).not.toBeNull();
  });

  it('removing an optional field does not throw when the step has no `with` map yet', () => {
    // Regression test: a step whose only fields are optional (e.g.
    // elasticsearch.bulk before its required `operations` was correctly
    // surfaced) starts with no `with:` key at all. Add-then-remove used to
    // call yaml's `deleteIn(['with', key])`, which throws on a missing `with`
    // instead of treating it as a no-op (unlike `setIn`).
    const optionalOnlyConnectors: ConnectorContractUnion[] = [
      {
        type: 'listish',
        hasConnectorId: false,
        paramsSchema: z.object({
          pipeline: z.string().optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'Listish',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const { onFragmentChange } = renderPanel({
      stepType: 'listish',
      connectors: optionalOnlyConnectors,
      initialFragment: 'name: t\ntype: listish\n',
    });
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-with.pipeline'));
    expect(screen.getByTestId('workflowStepConfigField-with.pipeline')).toBeInTheDocument();
    expect(() => {
      fireEvent.click(screen.getByTestId('workflowStepConfigRemoveOptional-with.pipeline'));
    }).not.toThrow();
    expect(screen.queryByTestId('workflowStepConfigField-with.pipeline')).not.toBeInTheDocument();
    for (const call of onFragmentChange.mock.calls) {
      expect(call[0] as string).not.toContain('with:');
    }
  });

  it('closes immediately from the header after editing via the YAML view (valid draft, no Done needed)', () => {
    const { onClose } = renderPanel();
    expect(screen.getByTestId('workflowStepConfigPanelTabs')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelAccordion-inputs')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelView-yaml'));
    expect(screen.queryByTestId('workflowStepConfigPanelAccordion-inputs')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelTabs')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('workflowStepConfigPanelYaml'), {
      target: { value: 'name: renamed\ntype: slack\nconnector-id: abc\nwith:\n  message: yo\n' },
    });
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelView-form'));
    expect(screen.getByTestId('workflowStepConfigPanelAccordion-inputs')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('renamed');
    expect(screen.getByTestId('workflowStepConfigField-with.message')).toHaveValue('yo');
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelClose'));
    // The draft is valid — already live in the YAML via onFragmentChange — so
    // ✕ just closes; nothing to discard.
    expect(screen.queryByTestId('workflowStepConfigPanelDiscardModal')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Remove node in insert mode and Reset node (disabled until dirty) in edit mode', () => {
    const { onRevert, unmount } = renderPanel({ mode: 'insert', actionLabel: 'Slack Message' });
    expect(screen.queryByTestId('workflowStepConfigPanelResetNode')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelRemoveNode'));
    expect(onRevert).toHaveBeenCalledTimes(1);
    unmount();

    const { onRevert: onRevertEdit } = renderPanel();
    expect(screen.queryByTestId('workflowStepConfigPanelRemoveNode')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelResetNode')).toBeDisabled();
    fireEvent.change(screen.getByTestId('workflowStepConfigField-with.message'), {
      target: { value: 'Edited locally' },
    });
    expect(screen.getByTestId('workflowStepConfigPanelResetNode')).toBeEnabled();
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelResetNode'));
    expect(onRevertEdit).toHaveBeenCalledTimes(1);
  });

  it('closing an invalid draft prompts to discard; Keep editing preserves it', () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelView-yaml'));
    fireEvent.change(screen.getByTestId('workflowStepConfigPanelYaml'), {
      // Malformed indentation — not valid YAML.
      target: { value: 'name: n\n  type: slack\n' },
    });
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelClose'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('workflowStepConfigPanelDiscardModal')).toBeInTheDocument();
    expect(screen.getByText('Discard changes to this step?')).toBeInTheDocument();
    expect(
      screen.getByText(
        "This draft has errors and wasn't applied to the step. Closing now will discard it."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Keep editing'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId('workflowStepConfigPanelDiscardModal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowStepConfigPanelClose'));
    fireEvent.click(screen.getByText('Discard'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wires the shared reference affordance on text and code fields, not name/switches/selects', () => {
    const requestConnectors: ConnectorContractUnion[] = [
      {
        type: 'kibana.request',
        hasConnectorId: false,
        paramsSchema: z.object({
          method: z.enum(['GET', 'POST']).optional(),
          path: z.string(),
          body: z.record(z.string(), z.unknown()).optional(),
          headers: z.record(z.string(), z.unknown()).optional(),
          query: z.record(z.string(), z.unknown()).optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'Kibana Request',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    render(
      <I18nProvider>
        <StepConfigPanel
          mode="edit"
          stepType="kibana.request"
          initialFragment={`name: req
type: kibana.request
with:
  method: GET
  path: /api/foo
  body:
    ok: true
  headers:
    x: "1"
`}
          connectors={requestConnectors}
          onClose={jest.fn()}
          onRevert={jest.fn()}
        />
      </I18nProvider>
    );

    // Body + Headers are code fields in Required; each gets an @ control.
    const bodyRow = screen
      .getByTestId('workflowStepConfigField-with.body')
      .closest('.euiFormRow') as HTMLElement;
    const headersRow = screen
      .getByTestId('workflowStepConfigField-with.headers')
      .closest('.euiFormRow') as HTMLElement;
    expect(within(bodyRow).getByTestId('workflowStepConfigDataReference')).toBeInTheDocument();
    expect(within(headersRow).getByTestId('workflowStepConfigDataReference')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
    fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-with.query'));
    const queryRow = screen
      .getByTestId('workflowStepConfigField-with.query')
      .closest('.euiFormRow') as HTMLElement;
    expect(within(queryRow).getByTestId('workflowStepConfigDataReference')).toBeInTheDocument();

    // Select (method) has no affordance.
    const method = screen.getByTestId('workflowStepConfigField-with.method');
    expect(
      method.querySelector?.('[data-test-subj="workflowStepConfigDataReference"]')
    ).toBeFalsy();
    expect(
      method
        .closest('.euiFormRow')
        ?.querySelector('[data-test-subj="workflowStepConfigDataReference"]')
    ).toBeNull();

    // Step name editor ignores reference triggers.
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelEditName'));
    const nameInput = screen.getByTestId('workflowStepConfigPanelNameInput');
    expect(
      nameInput.closest('div')?.querySelector('[data-test-subj="workflowStepConfigDataReference"]')
    ).toBeNull();
    fireEvent.change(nameInput, { target: { value: 'req@' } });
    expect(screen.queryByTestId('workflowDataReferenceSearch')).not.toBeInTheDocument();
  });

  it('shows an empty state when the step has no form fields', () => {
    const bareConnectors: ConnectorContractUnion[] = [
      {
        type: 'noop.action',
        hasConnectorId: false,
        paramsSchema: z.object({}),
        outputSchema: z.unknown(),
        summary: 'Noop',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    renderPanel({
      stepType: 'noop.action',
      connectors: bareConnectors,
      initialFragment: 'name: n\ntype: noop.action\n',
    });
    expect(screen.getByTestId('workflowStepConfigPanelEmpty')).toHaveTextContent(
      'No configuration needed'
    );
  });

  it('shows a YAML fallback empty state when the step type has no schema', () => {
    renderPanel({
      stepType: 'unknown.missing',
      connectors: [],
      initialFragment: 'name: n\ntype: unknown.missing\n',
    });
    expect(screen.getByTestId('workflowStepConfigPanelEmpty')).toHaveTextContent(
      'Form unavailable'
    );
  });

  it('resolves createCaseDefaultSpace alias fields in the form', () => {
    const connectors: ConnectorContractUnion[] = [
      {
        type: 'kibana.createCase',
        hasConnectorId: false,
        paramsSchema: z.object({
          title: z.string(),
          description: z.string().optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'Create a case',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    renderPanel({
      stepType: 'kibana.createCaseDefaultSpace',
      connectors,
      initialFragment: 'name: createCase\ntype: kibana.createCaseDefaultSpace\nwith:\n  title: t\n',
    });
    expect(screen.getByTestId('workflowStepConfigField-with.title')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigPanelEmpty')).not.toBeInTheDocument();
  });

  it('opens the picker from a Slack message body on typed @', () => {
    renderPanel();
    const message = screen.getByTestId('workflowStepConfigField-with.message') as HTMLInputElement;
    const affordance = message
      .closest('.euiFormRow')
      ?.querySelector('[data-test-subj="workflowStepConfigDataReference"]');
    expect(affordance).not.toBeNull();
    expect(affordance).toBeEnabled();
    fireEvent.change(message, { target: { value: 'Hi @', selectionStart: 4, selectionEnd: 4 } });
    expect(screen.getByTestId('workflowDataReferenceSearch')).toBeInTheDocument();
  });

  it('lets ES|QL query fields accept Liquid references without JSON parsing', () => {
    const esqlConnectors: ConnectorContractUnion[] = [
      {
        type: 'elasticsearch.esql.query',
        hasConnectorId: false,
        paramsSchema: z.object({
          query: z.string().min(1),
        }),
        outputSchema: z.unknown(),
        summary: 'Run an ES|QL query',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const onFragmentChange = jest.fn();
    render(
      <I18nProvider>
        <StepConfigPanel
          mode="edit"
          stepType="elasticsearch.esql.query"
          initialFragment={`name: run_esql
type: elasticsearch.esql.query
with:
  query: "FROM logs"
`}
          connectors={esqlConnectors}
          onClose={jest.fn()}
          onRevert={jest.fn()}
          onFragmentChange={onFragmentChange}
        />
      </I18nProvider>
    );

    const query = screen.getByTestId('workflowStepConfigField-with.query');
    expect(query).toHaveAttribute('data-language', 'esql');
    expect(
      query.querySelector('[data-test-subj="workflowStepConfigDataReference"]')
    ).not.toBeNull();
    // TODO(slice7): ES|QL stays specialized — no expanded field editor.
    expect(
      query.querySelector('[data-test-subj="workflowStepConfigDataReferenceExpand"]')
    ).toBeNull();

    const editor = within(query).getByTestId('mocked-code-editor') as HTMLTextAreaElement;
    fireEvent.change(editor, {
      target: {
        value: 'FROM logs | WHERE host == "{{ steps.prev.output }}"',
      },
    });

    // Live-applies via onFragmentChange — no Done button.
    expect(onFragmentChange).toHaveBeenCalled();
    const saved = onFragmentChange.mock.calls[onFragmentChange.mock.calls.length - 1][0] as string;
    expect(saved).toContain('{{ steps.prev.output }}');
    expect(saved).not.toMatch(/Must be valid JSON/);
  });

  it('opens the field-editor sub-flyout from ⤢ and writes through live', () => {
    const { onFragmentChange } = renderPanel();

    const messageRow = screen
      .getByTestId('workflowStepConfigField-with.message')
      .closest('.euiFormRow');
    expect(messageRow).not.toBeNull();
    fireEvent.click(
      within(messageRow as HTMLElement).getByTestId('workflowStepConfigDataReferenceExpand')
    );

    expect(screen.getByTestId('workflowFieldEditorSubFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('workflowFieldEditorSubFlyoutTitle')).toHaveTextContent('Message');
    expect(screen.getByTestId('workflowDataReferenceCatalogTree')).toBeInTheDocument();

    const textarea = screen.getByTestId(
      'workflowFieldEditorSubFlyoutTextarea'
    ) as HTMLTextAreaElement;
    expect(textarea).toHaveValue('Hi {{ inputs.user }}');
    fireEvent.change(textarea, {
      target: { value: 'Hello {{ consts.name }}', selectionStart: 22, selectionEnd: 22 },
    });

    // Live write-through into the step working state (inline field stays in sync).
    expect(screen.getByTestId('workflowStepConfigField-with.message')).toHaveValue(
      'Hello {{ consts.name }}'
    );

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyoutBack'));
    expect(screen.queryByTestId('workflowFieldEditorSubFlyout')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.message')).toHaveValue(
      'Hello {{ consts.name }}'
    );

    // Live-applied via onFragmentChange as it was typed — no Done button.
    expect(onFragmentChange).toHaveBeenCalled();
    const last = onFragmentChange.mock.calls[onFragmentChange.mock.calls.length - 1][0] as string;
    expect(last).toContain('Hello {{ consts.name }}');
  });

  it('shows expand on templatable text/code fields and keeps it off booleans/selects', () => {
    renderPanel();
    const messageRow = screen
      .getByTestId('workflowStepConfigField-with.message')
      .closest('.euiFormRow') as HTMLElement;
    expect(
      within(messageRow).getByTestId('workflowStepConfigDataReferenceExpand')
    ).toBeInTheDocument();

    // connector-id is a required text field — also expandable
    const connectorRow = screen
      .getByTestId('workflowStepConfigField-connector-id')
      .closest('.euiFormRow') as HTMLElement;
    expect(
      within(connectorRow).getByTestId('workflowStepConfigDataReferenceExpand')
    ).toBeInTheDocument();
  });

  it('renders JSON code Inputs as a single-line field with collapsed display; expand keeps formatting', () => {
    const requestConnectors: ConnectorContractUnion[] = [
      {
        type: 'kibana.request',
        hasConnectorId: false,
        paramsSchema: z.object({
          method: z.enum(['GET', 'POST']),
          path: z.string(),
          body: z.record(z.string(), z.unknown()),
        }),
        outputSchema: z.unknown(),
        summary: 'HTTP Request',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const { onFragmentChange } = renderPanel({
      stepType: 'kibana.request',
      connectors: requestConnectors,
      initialFragment: `name: req
type: kibana.request
with:
  method: GET
  path: /api/foo
  body:
    fields: null
    id: none
`,
    });

    const body = screen.getByTestId('workflowStepConfigField-with.body') as HTMLInputElement;
    expect(body.tagName).toBe('INPUT');
    // Pretty JSON collapsed to a single line for display.
    expect(body.value).toBe('{ "fields": null, "id": "none" }');
    expect(body.value).not.toMatch(/\n/);

    fireEvent.click(
      within(body.closest('.euiFormRow') as HTMLElement).getByTestId(
        'workflowStepConfigDataReferenceExpand'
      )
    );
    // Expand shows the stored (pretty) value, not the collapsed display string.
    expect(screen.getByTestId('workflowFieldEditorSubFlyoutTextarea')).toHaveValue(
      '{\n  "fields": null,\n  "id": "none"\n}'
    );

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyoutBack'));
    // Live-applied via onFragmentChange — no Done button.
    const saved = onFragmentChange.mock.calls[onFragmentChange.mock.calls.length - 1][0] as string;
    // Document keeps structured YAML — display collapse must not flatten the source.
    expect(saved).toMatch(/body:\n\s+fields: null\n\s+id: none/);
  });
});
