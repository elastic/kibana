/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConnectorContractUnion } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { StepConfigPanel } from './step_config_panel';

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
      const textareaRef = MockReact.useRef<HTMLTextAreaElement | null>(null);
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

jest.mock('@kbn/monaco', () => ({ XJSON_LANG_ID: 'xjson', YAML_LANG_ID: 'yaml' }));
jest.mock('@kbn/workflows-ui', () => ({
  WORKFLOWS_MONACO_EDITOR_THEME: 'theme',
  ensureWorkflowGraphEuiIcons: jest.fn(),
  stepSupportsErrorHandling: (stepType: string | undefined) =>
    Boolean(
      stepType &&
        !['if', 'foreach', 'parallel', 'while', 'merge', 'atomic'].includes(stepType)
    ),
}));
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="mocked-step-icon" />,
}));

jest.mock('../../actions_menu_popover', () => ({
  ActionsMenu: ({
    rootTitle,
    onClose,
  }: {
    rootTitle?: string;
    onClose?: () => void;
  }) => (
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
  const onSave = jest.fn();
  const onCancel = jest.fn();
  render(
    <I18nProvider>
      <StepConfigPanel
        mode="edit"
        stepType="slack"
        initialFragment={FRAGMENT}
        connectors={connectors}
        onSave={onSave}
        onCancel={onCancel}
        {...overrides}
      />
    </I18nProvider>
  );
  return { onSave, onCancel };
};

describe('StepConfigPanel', () => {
  it('renders instance name as title with catalog · type subtitle', () => {
    renderPanel();
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('notify');
    expect(screen.getByTestId('workflowStepConfigPanelCatalog')).toHaveTextContent('Slack');
    expect(screen.getByTestId('workflowStepConfigPanelType')).toHaveTextContent('slack');
    expect(screen.getByTestId('workflowStepConfigPanelSubtitle')).toHaveTextContent('Slack');
    expect(screen.queryByText(/Configure/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigField-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.message')).toHaveValue(
      'Hi {{ inputs.user }}'
    );
    // Humanized labels — not raw YAML keys. Name lives in the header only.
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
    expect(screen.getByText('Connector id')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    // Uncurated: optional fields (query) land in Advanced via requiredness.
    expect(screen.getByTestId('workflowStepConfigAdvancedFields')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigAdvancedFields'));
    expect(screen.getByTestId('workflowStepConfigField-with.query')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigErrorHandlingSection')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigConfiguration')).toHaveTextContent('Required');
    expect(screen.getByTestId('workflowStepConfigAdvancedFields')).toHaveTextContent('Optional');
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
    expect(screen.getByTestId('workflowStepConfigPanelCatalog')).toHaveTextContent('Slack Message');
    expect(screen.getByTestId('workflowStepConfigPanelType')).toHaveTextContent('slack');
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

  it('prettifies types that lack a catalog display name', () => {
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
      stepType: 'kibana.createCaseDefaultSpace',
      connectors: bareConnectors,
      initialFragment:
        'name: open_case\ntype: kibana.createCaseDefaultSpace\nwith:\n  title: t\n',
    });
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('open_case');
    expect(screen.getByTestId('workflowStepConfigPanelCatalog')).toHaveTextContent(
      'Create case default space'
    );
    expect(screen.getByTestId('workflowStepConfigPanelType')).toHaveTextContent(
      'kibana.createCaseDefaultSpace'
    );
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
    // Uncurated optional → Advanced.
    expect(screen.getByTestId('workflowStepConfigAdvancedFields')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigAdvancedFields'));
    expect(screen.getByText('Fail on error')).toBeInTheDocument();
    expect(
      screen.queryByTestId('workflowStepConfigFieldKey-with.failOnError')
    ).not.toBeInTheDocument();
  });

  it('keeps all optional fields in Optional regardless of values', () => {
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
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      </I18nProvider>
    );

    // Promoted / required fields stay in Configuration.
    expect(screen.queryByTestId('workflowStepConfigField-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.method')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.path')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.body')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.headers')).toBeInTheDocument();

    // All advanced keys live in Optional — valued query does not promote inline.
    expect(screen.getByTestId('workflowStepConfigAdvancedFields')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigAdvancedCountBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigAdvancedSetBadge')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowStepConfigAdvancedFields'));
    expect(screen.getByTestId('workflowStepConfigField-with.query')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigField-with.form_data')).toBeInTheDocument();
  });

  it('keeps http primary fields inline and all curated advanced keys in Advanced', () => {
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
    expect(screen.getByTestId('workflowStepConfigAdvancedFields')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigAdvancedCountBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigAdvancedSetBadge')).not.toBeInTheDocument();

    // Required may show Optional on hint-promoted fields; Optional never does.
    const urlRow = screen.getByTestId('workflowStepConfigField-with.url').closest('.euiFormRow');
    expect(urlRow).toHaveTextContent('Optional');
    fireEvent.click(screen.getByTestId('workflowStepConfigAdvancedFields'));
    const pathRow = screen.getByTestId('workflowStepConfigField-with.path').closest('.euiFormRow');
    expect(pathRow).not.toHaveTextContent('Optional');
  });

  it('puts uncurated optionals in Advanced via requiredness', () => {
    renderPanel({
      initialFragment:
        'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n  query:\n    q: "1"\n',
    });
    expect(screen.getByTestId('workflowStepConfigAdvancedFields')).toBeInTheDocument();
    // Error handling remains — Configuration + Advanced + Error handling use accordion chrome.
    expect(screen.getByTestId('workflowStepConfigConfiguration')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigErrorHandlingSection')).toBeInTheDocument();
  });

  it('renders a plain form with no accordion chrome when only Configuration applies', () => {
    renderPanel({
      stepType: 'if',
      initialFragment: 'name: branch\ntype: if\ncondition: "true"\n',
      connectors: [],
      isFallbackStep: false,
    });
    expect(screen.queryByTestId('workflowStepConfigConfiguration')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigAdvancedFields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigErrorHandlingSection')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelForm')).toBeInTheDocument();
  });

  it('writes retry and continue through on-failure and clears keys when toggled off', () => {
    renderPanel({
      initialFragment: 'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n',
      onRevealErrorPort: jest.fn(),
    });
    // Accordion content stays in the DOM in the EUI test env — toggle switches directly.
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorRetry'));
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorContinue'));
    fireEvent.click(screen.getByText('YAML'));
    const yaml = (screen.getByTestId('workflowStepConfigPanelYaml') as HTMLTextAreaElement).value;
    expect(yaml).toContain('on-failure:');
    expect(yaml).toContain('max-attempts: 3');
    expect(yaml).toContain('delay: 5s');
    expect(yaml).toContain('continue: true');

    fireEvent.click(screen.getByText('Form'));
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorRetry'));
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorContinue'));
    fireEvent.click(screen.getByText('YAML'));
    const cleared = (screen.getByTestId('workflowStepConfigPanelYaml') as HTMLTextAreaElement)
      .value;
    expect(cleared).not.toContain('on-failure');
  });

  it('hides Error handling for fallback steps and shows canvas discovery when eligible', () => {
    const onRevealErrorPort = jest.fn();
    const { unmount } = render(
      <I18nProvider>
        <StepConfigPanel
          mode="edit"
          stepType="slack"
          initialFragment="name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n"
          connectors={connectors}
          onSave={jest.fn()}
          onCancel={jest.fn()}
          isFallbackStep
          onRevealErrorPort={onRevealErrorPort}
        />
      </I18nProvider>
    );
    expect(screen.queryByTestId('workflowStepConfigErrorHandlingSection')).not.toBeInTheDocument();
    unmount();

    renderPanel({
      initialFragment: 'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n',
      onRevealErrorPort,
    });
    expect(screen.getByTestId('workflowStepConfigErrorShowMe')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowStepConfigErrorAddFallback')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowStepConfigErrorShowMe'));
    expect(onRevealErrorPort).toHaveBeenCalled();
  });

  it('shows a live missing-required badge on Configuration when a required field is empty', () => {
    renderPanel({
      initialFragment: 'name: n\ntype: slack\nconnector-id: abc\nwith: {}\n',
    });
    expect(screen.getByTestId('workflowStepConfigMissingRequiredBadge')).toHaveTextContent(
      /required field/
    );
  });

  it('round-trips Form → YAML preserving comments, unknown keys and Liquid', () => {
    const { onSave } = renderPanel();
    fireEvent.change(screen.getByTestId('workflowStepConfigField-with.message'), {
      target: { value: 'Changed {{ inputs.user }}' },
    });
    fireEvent.click(screen.getByText('YAML'));
    const yaml = (screen.getByTestId('workflowStepConfigPanelYaml') as HTMLTextAreaElement).value;
    expect(yaml).toContain('# step comment');
    expect(yaml).toContain('x-owner: team-a');
    expect(yaml).toContain('# trailing comment');
    expect(yaml).toContain('Changed {{ inputs.user }}');
    expect(yaml).toContain('connector-id: abc');

    fireEvent.click(screen.getByTestId('workflowStepConfigPanelSave'));
    expect(onSave).toHaveBeenCalledWith(yaml);
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

  it('validates on blur; Save is disabled while the form has errors', () => {
    const { onSave } = renderPanel({
      initialFragment: 'name: n\ntype: slack\nconnector-id: abc\nwith: {}\n',
    });
    const messageInput = screen.getByTestId('workflowStepConfigField-with.message');
    expect(messageInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('workflowStepConfigPanelSave')).toBeDisabled();

    // Mid-typing an empty required field does not accuse, but Save stays disabled.
    fireEvent.change(messageInput, { target: { value: '' } });
    expect(messageInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Message is required')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelSave')).toBeDisabled();

    fireEvent.blur(messageInput);
    expect(messageInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Message is required')).toBeInTheDocument();

    // Fast forgiveness once already invalid — Save re-enables when valid.
    fireEvent.change(messageInput, { target: { value: 'hello' } });
    expect(messageInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Message is required')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelSave')).toBeEnabled();

    fireEvent.change(messageInput, { target: { value: 'Hi {{ inputs.x' } });
    expect(screen.getByTestId('workflowStepConfigPanelSave')).toBeDisabled();
    fireEvent.click(screen.getByTestId('workflowStepConfigPanelSave'));
    expect(onSave).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByTestId('workflowStepConfigAdvancedFields'));
    const switchEl = screen.getByTestId('workflowStepConfigField-with.debug');
    const row = screen.getByTestId('workflowStepConfigField-with.debug-row');
    expect(row).toContainElement(switchEl);
    expect(row).toHaveTextContent('Debug');
    // Optional markers are Configuration-only; Advanced never shows them.
    expect(row).not.toHaveTextContent('Optional');
    expect(row).toHaveTextContent('Include debug output');
    // Switch is not alone on a stacked field row — label is associated via htmlFor.
    expect(switchEl).toHaveAttribute('id');
    const label = row.querySelector(`label[for="${switchEl.getAttribute('id')}"]`);
    expect(label).not.toBeNull();
  });

  it('Escape cancels and the YAML view edits flow back to the form', () => {
    const { onCancel } = renderPanel();
    fireEvent.click(screen.getByText('YAML'));
    fireEvent.change(screen.getByTestId('workflowStepConfigPanelYaml'), {
      target: { value: 'name: renamed\ntype: slack\nconnector-id: abc\nwith:\n  message: yo\n' },
    });
    fireEvent.click(screen.getByText('Form'));
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('renamed');
    expect(screen.getByTestId('workflowStepConfigField-with.message')).toHaveValue('yo');
    fireEvent.keyDown(screen.getByTestId('workflowStepConfigPanel'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
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
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      </I18nProvider>
    );

    // Body + Headers are code fields in Required; each gets an @ control.
    const body = screen.getByTestId('workflowStepConfigField-with.body');
    const headers = screen.getByTestId('workflowStepConfigField-with.headers');
    expect(body.querySelector('[data-test-subj="workflowStepConfigDataReference"]')).not.toBeNull();
    expect(headers.querySelector('[data-test-subj="workflowStepConfigDataReference"]')).not.toBeNull();

    fireEvent.click(screen.getByTestId('workflowStepConfigAdvancedFields'));
    const query = screen.getByTestId('workflowStepConfigField-with.query');
    expect(query.querySelector('[data-test-subj="workflowStepConfigDataReference"]')).not.toBeNull();

    // Select (method) has no affordance.
    const method = screen.getByTestId('workflowStepConfigField-with.method');
    expect(method.querySelector?.('[data-test-subj="workflowStepConfigDataReference"]')).toBeFalsy();
    expect(
      method.closest('.euiFormRow')?.querySelector('[data-test-subj="workflowStepConfigDataReference"]')
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
});
