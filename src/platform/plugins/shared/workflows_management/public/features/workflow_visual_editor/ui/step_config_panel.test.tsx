/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { resetStepConfigPanelSessionStateForTests, StepConfigPanel } from './step_config_panel';
import { insertIntoActiveDataReferenceTarget } from '../../../shared/lib/active_data_reference_insert_target';

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
        onKeyDown: (cb: (event: unknown) => void) => void;
        onDidBlurEditorText: (cb: () => void) => void;
        setSelection: (range: unknown) => void;
        executeEdits: (source: string, edits: unknown[]) => void;
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
      const blurRef = (MockReact.useRef as <T>(val: T | null) => React.MutableRefObject<T | null>)<
        () => void
      >(null);
      MockReact.useEffect(() => {
        props.editorDidMount?.({
          focus: () => textareaRef.current?.focus(),
          onKeyDown: () => undefined,
          onDidBlurEditorText: (cb: () => void) => {
            blurRef.current = cb;
          },
          setSelection: () => undefined,
          executeEdits: () => undefined,
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
          onBlur={() => blurRef.current?.()}
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
  workflowsEditorChromeOverrides: {},
  ensureWorkflowGraphEuiIcons: jest.fn(),
  loadTypeIconMasks: () => Promise.resolve({}),
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
jest.mock('../model/use_step_output_samples', () => ({
  useStepOutputSamples: () => ({ byStep: {}, isFullRunInProgress: false }),
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

/**
 * Text fields are a read view (chips) until focused; focusing mounts the single-line editor,
 * mocked here as a textarea carrying the same test id. Returns the element to type into.
 */
const activateField = (testId: string): HTMLElement => {
  const element = screen.getByTestId(testId);
  if (element.getAttribute('data-mode') === 'read') fireEvent.focusIn(element);
  return screen.getByTestId(testId);
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
    expect(activateField('workflowStepConfigField-with.message')).toHaveValue(
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
    fireEvent.change(activateField('workflowStepConfigField-with.message'), {
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
    const messageField = () => screen.getByTestId('workflowStepConfigField-with.message');
    expect(messageField()).not.toHaveAttribute('aria-invalid', 'true');

    // Mid-typing an empty required field does not accuse, and still live-applies
    // (incomplete state is apply-able — the canvas badge reflects it).
    fireEvent.change(activateField('workflowStepConfigField-with.message'), {
      target: { value: '' },
    });
    expect(screen.queryByText('Message is required')).not.toBeInTheDocument();
    expect(onFragmentChange).toHaveBeenCalled();

    // Leaving the field (the editor unmounts back to the read view) accuses.
    fireEvent.blur(messageField());
    expect(messageField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Message is required')).toBeInTheDocument();

    // Fast forgiveness once already invalid.
    fireEvent.change(activateField('workflowStepConfigField-with.message'), {
      target: { value: 'hello' },
    });
    expect(screen.queryByText('Message is required')).not.toBeInTheDocument();

    // Misconfigured values (e.g. unclosed template) still live-apply — the
    // canvas badge reflects them; the panel never gates on advisory errors.
    fireEvent.change(activateField('workflowStepConfigField-with.message'), {
      target: { value: 'Hi {{ inputs.x' },
    });
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
    expect(activateField('workflowStepConfigField-with.message')).toHaveValue('yo');
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
    fireEvent.change(activateField('workflowStepConfigField-with.message'), {
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
    const message = activateField('workflowStepConfigField-with.message') as HTMLTextAreaElement;
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
    expect(activateField('workflowStepConfigField-with.message')).toHaveValue(
      'Hello {{ consts.name }}'
    );

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyoutBack'));
    expect(screen.queryByTestId('workflowFieldEditorSubFlyout')).not.toBeInTheDocument();
    expect(activateField('workflowStepConfigField-with.message')).toHaveValue(
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

    const body = screen.getByTestId('workflowStepConfigField-with.body');
    expect(body).toHaveAttribute('data-language', 'json');
    // Pretty JSON collapsed to a single line for display.
    expect(body).toHaveTextContent('{ "fields": null, "id": "none" }');
    expect(activateField('workflowStepConfigField-with.body')).toHaveValue(
      '{ "fields": null, "id": "none" }'
    );

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

  describe('Fixed | Data switch', () => {
    const switchConnectors: ConnectorContractUnion[] = [
      {
        type: 'switchy',
        hasConnectorId: false,
        paramsSchema: z.object({
          retries: z.number().optional(),
          debug: z.boolean().optional(),
          method: z.enum(['GET', 'POST']).optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'Switchy',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const renderSwitchy = (fragment: string) =>
      renderPanel({ stepType: 'switchy', connectors: switchConnectors, initialFragment: fragment });
    const savedFragments = (spy: jest.Mock) =>
      spy.mock.calls.map(([fragment]) => fragment as string);

    it('writes the value form when a number takes data, and clears it going back to Fixed', () => {
      const { onFragmentChange } = renderSwitchy('name: s\ntype: switchy\nwith:\n  retries: 3\n');
      expect(screen.getByTestId('workflowStepConfigField-with.retries')).toHaveValue(3);

      fireEvent.click(screen.getByTestId('workflowStepConfigField-with.retries-source-data'));
      const box = screen.getByTestId('workflowStepConfigField-with.retries');
      expect(box).toHaveTextContent('Select data from an earlier step');
      // Switching alone never rewrites the YAML.
      expect(savedFragments(onFragmentChange).every((f) => /retries: 3/.test(f))).toBe(true);

      fireEvent.focusIn(within(box).getByTestId('workflowStepConfigField-with.retries-pick'));
      act(() => {
        insertIntoActiveDataReferenceTarget('{{ consts.limit }}');
      });
      const picked = savedFragments(onFragmentChange).pop();
      expect(picked).toMatch(/retries: ["']?\$\{\{ consts\.limit \}\}["']?/);
      expect(screen.getByTestId('workflowStepConfigField-with.retries-chip')).toHaveTextContent(
        'consts.limit'
      );

      fireEvent.click(screen.getByTestId('workflowStepConfigField-with.retries-source-fixed'));
      expect(savedFragments(onFragmentChange).pop()).not.toMatch(/retries/);
    });

    it('never writes an empty string when a yes/no field switches to Data', () => {
      const { onFragmentChange } = renderSwitchy('name: s\ntype: switchy\nwith:\n  debug: true\n');
      fireEvent.click(screen.getByTestId('workflowStepConfigField-with.debug-source-data'));
      expect(savedFragments(onFragmentChange).some((f) => /debug: (""|'')/.test(f))).toBe(false);

      fireEvent.focusIn(screen.getByTestId('workflowStepConfigField-with.debug-pick'));
      act(() => {
        insertIntoActiveDataReferenceTarget('{{ consts.flag }}');
      });
      expect(savedFragments(onFragmentChange).pop()).toMatch(
        /debug: ["']?\$\{\{ consts\.flag \}\}["']?/
      );
    });

    it('flags a legacy text-form reference on a number and rewrites it on "Keep the type"', () => {
      const { onFragmentChange } = renderSwitchy(
        'name: s\ntype: switchy\nwith:\n  retries: "{{ consts.limit }}"\n'
      );
      const chip = screen.getByTestId('workflowStepConfigField-with.retries-chip');
      expect(chip).toHaveAttribute('data-tone', 'warning');
      // A reference is never a "Must be a number" error.
      expect(screen.queryByText('Must be a number')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('workflowStepConfigField-with.retries-keepType'));
      expect(savedFragments(onFragmentChange).pop()).toMatch(
        /retries: ["']?\$\{\{ consts\.limit \}\}["']?/
      );
    });

    it('keeps a dropdown reference in the text form and offers no literal {{ }} option', () => {
      const { onFragmentChange } = renderSwitchy('name: s\ntype: switchy\nwith:\n  method: GET\n');
      fireEvent.click(screen.getByTestId('workflowStepConfigField-with.method-source-data'));
      fireEvent.focusIn(screen.getByTestId('workflowStepConfigField-with.method-pick'));
      act(() => {
        insertIntoActiveDataReferenceTarget('{{ inputs.method }}');
      });
      expect(savedFragments(onFragmentChange).pop()).toMatch(
        /method: ["']?\{\{ inputs\.method \}\}["']?/
      );
      // A text-form reference in a text field is correct, so it is not flagged.
      expect(screen.getByTestId('workflowStepConfigField-with.method-chip')).toHaveAttribute(
        'data-tone',
        'neutral'
      );
    });

    it('offers no references or switch for a fixed-only loop cap', () => {
      renderPanel({
        stepType: 'while',
        initialFragment:
          'name: w\ntype: while\ncondition: "x"\nmax-iterations: 10\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n',
      });
      const field = screen.getByTestId('workflowStepConfigField-max-iterations');
      const row = field.closest('.workflowStepConfigFieldRow') as HTMLElement;
      expect(field).toHaveValue('10');
      expect(row).toHaveTextContent('Read exactly as typed');
      expect(within(row).queryByTestId('workflowStepConfigDataReference')).not.toBeInTheDocument();
      expect(
        within(row).queryByTestId('workflowStepConfigField-max-iterations-source-data')
      ).not.toBeInTheDocument();
    });
  });

  describe('reference chips in text controls', () => {
    const listDefinition = {
      version: '1',
      name: 'demo',
      enabled: true,
      triggers: [{ type: 'manual' }],
      consts: { tags: ['a', 'b'] },
      steps: [{ name: 'notify', type: 'slack', with: { message: 'x' } }],
    } as unknown as WorkflowYaml;

    it('draws references as chips with accessible names, and edits as plain text', () => {
      renderPanel();
      const readView = screen.getByTestId('workflowStepConfigField-with.message');
      expect(readView).toHaveAttribute('data-mode', 'read');
      const chip = within(readView).getByTestId('workflowReferenceChip');
      expect(chip).toHaveAttribute('aria-label', 'Reference inputs.user, unknown');
      expect(chip).toHaveTextContent('inputs.user');
      expect(readView).toHaveTextContent('Hi');
      // Focusing swaps in the editor, which holds the real text (braces included).
      expect(activateField('workflowStepConfigField-with.message')).toHaveValue(
        'Hi {{ inputs.user }}'
      );
    });

    it('lets only the last text run shrink so a long sentence never squeezes a chip', () => {
      renderPanel({
        initialFragment:
          'name: n\ntype: slack\nconnector-id: abc\nwith:\n  message: "Found {{ inputs.user }} in a long sentence"\n',
      });
      const readView = screen.getByTestId('workflowStepConfigField-with.message');
      const flex = (element: Element) => {
        const { flexGrow, flexShrink } = getComputedStyle(element);
        return `${flexGrow} ${flexShrink}`;
      };
      const [leading, trailing] = Array.from(readView.querySelectorAll('[data-run-offset]'));
      const chip = readView.querySelector('[data-ref-start]') as Element;
      expect(flex(leading)).toBe('0 0');
      expect(flex(chip)).toBe('0 0');
      // The trailing text is the one that gives way (with an ellipsis).
      expect(flex(trailing)).toBe('0 1');
      expect(getComputedStyle(trailing).textOverflow).toBe('ellipsis');
    });

    it('draws a comparison in an if condition as a boolean pill, not unknown', () => {
      renderPanel({
        stepType: 'if',
        initialFragment:
          'name: gate\ntype: if\ncondition: "${{ event.alerts[0] != blank }}"\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n',
      });
      const chip = within(screen.getByTestId('workflowStepConfigField-condition')).getByTestId(
        'workflowReferenceChip'
      );
      expect(chip).toHaveAttribute('aria-label', 'Reference event.alerts[0] != blank, boolean');
    });

    it('opens the picker on the chip to swap it when a chip is clicked', () => {
      renderPanel();
      const chip = within(screen.getByTestId('workflowStepConfigField-with.message')).getByTestId(
        'workflowReferenceChip'
      );
      fireEvent.click(chip);
      expect(screen.getByTestId('workflowDataReferenceSearch')).toBeInTheDocument();
    });

    it('teaches { as the trigger in an empty plain text field', () => {
      renderPanel({
        initialFragment: 'name: n\ntype: slack\nconnector-id: abc\nwith:\n  message: ""\n',
      });
      expect(screen.getByTestId('workflowStepConfigField-with.message')).toHaveTextContent(
        'Type { to insert data'
      );
    });

    it('opens the picker on a single typed { in plain text', () => {
      renderPanel({
        initialFragment: 'name: n\ntype: slack\nconnector-id: abc\nwith:\n  message: "Hi "\n',
      });
      fireEvent.change(activateField('workflowStepConfigField-with.message'), {
        target: { value: 'Hi {', selectionStart: 4, selectionEnd: 4 },
      });
      expect(screen.getByTestId('workflowDataReferenceSearch')).toBeInTheDocument();
    });

    it('does not treat { as a trigger inside a JSON field', () => {
      renderPanel({
        initialFragment:
          'name: n\ntype: slack\nconnector-id: abc\nwith:\n  message: hi\n  query:\n    a: 1\n',
      });
      fireEvent.change(activateField('workflowStepConfigField-with.query'), {
        target: { value: '{ "a": 1 }{', selectionStart: 11, selectionEnd: 11 },
      });
      expect(screen.queryByTestId('workflowDataReferenceSearch')).not.toBeInTheDocument();
    });

    it('warns about a list inside a sentence and rewrites it as JSON text', () => {
      const { onFragmentChange } = renderPanel({
        workflowDefinition: listDefinition,
        initialFragment:
          'name: notify\ntype: slack\nconnector-id: abc\nwith:\n  message: "Tags {{ consts.tags }} done"\n',
      });
      const chip = within(screen.getByTestId('workflowStepConfigField-with.message')).getByTestId(
        'workflowReferenceChip'
      );
      expect(chip).toHaveAttribute('data-tone', 'warning');
      expect(
        screen.getByTestId('workflowStepConfigField-with.message-containerCallout')
      ).toBeVisible();

      fireEvent.click(screen.getByTestId('workflowStepConfigField-with.message-insertAsJson'));
      const saved = onFragmentChange.mock.calls[
        onFragmentChange.mock.calls.length - 1
      ][0] as string;
      expect(saved).toContain('Tags {{ consts.tags | json }} done');
      expect(
        screen.queryByTestId('workflowStepConfigField-with.message-containerCallout')
      ).not.toBeInTheDocument();
    });

    it('dismisses the warning with "Keep as is" without changing the text', () => {
      const { onFragmentChange } = renderPanel({
        workflowDefinition: listDefinition,
        initialFragment:
          'name: notify\ntype: slack\nconnector-id: abc\nwith:\n  message: "Tags {{ consts.tags }} done"\n',
      });
      fireEvent.click(screen.getByTestId('workflowStepConfigField-with.message-keepAsIs'));
      expect(
        screen.queryByTestId('workflowStepConfigField-with.message-containerCallout')
      ).not.toBeInTheDocument();
      const writes = onFragmentChange.mock.calls.map(([fragment]) => fragment as string);
      expect(writes.every((fragment) => !fragment.includes('| json'))).toBe(true);
    });
  });

  describe('key/value rows', () => {
    const setStep = (withBlock: string) => ({
      stepType: 'data.set',
      initialFragment: `name: vars\ntype: data.set\nwith:${withBlock}\n`,
    });
    const lastFragment = (spy: jest.Mock) => spy.mock.calls[spy.mock.calls.length - 1][0] as string;

    it('shows the map of a data.set step as Variables rows', () => {
      renderPanel(setStep('\n  alert_count: "3"\n  user_name: ana'));
      expect(screen.getByText('Variables')).toBeInTheDocument();
      expect(screen.getByTestId('workflowStepConfigField-with-key-0')).toHaveValue('alert_count');
      expect(screen.getByTestId('workflowStepConfigField-with-key-1')).toHaveValue('user_name');
      expect(activateField('workflowStepConfigField-with-value-1')).toHaveValue('ana');
      expect(screen.getByTestId('workflowStepConfigField-with-add')).toHaveTextContent(
        'Add variable'
      );
    });

    it('starts an empty data.set with just the add button, and writes rows as they are named', () => {
      const { onFragmentChange } = renderPanel(setStep(' {}'));
      expect(screen.queryByTestId('workflowStepConfigField-with-key-0')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('workflowStepConfigField-with-add'));
      // A row without a name is a draft: nothing is written for it yet.
      expect(lastFragment(onFragmentChange)).not.toMatch(/: ""/);

      fireEvent.change(screen.getByTestId('workflowStepConfigField-with-key-0'), {
        target: { value: 'status' },
      });
      fireEvent.change(activateField('workflowStepConfigField-with-value-0'), {
        target: { value: 'escalated' },
      });
      expect(lastFragment(onFragmentChange)).toMatch(/status: escalated/);
    });

    it('flags a repeated name and does not write the repeat', () => {
      const { onFragmentChange } = renderPanel(setStep('\n  user_name: ana'));
      fireEvent.click(screen.getByTestId('workflowStepConfigField-with-add'));
      fireEvent.change(screen.getByTestId('workflowStepConfigField-with-key-1'), {
        target: { value: 'user_name' },
      });
      fireEvent.change(activateField('workflowStepConfigField-with-value-1'), {
        target: { value: 'bob' },
      });
      expect(screen.getByText('Duplicate name "user_name"')).toBeInTheDocument();
      expect(lastFragment(onFragmentChange)).toMatch(/user_name: ana/);
      expect(lastFragment(onFragmentChange)).not.toMatch(/bob/);
    });

    it('keeps rows in the order shown and removes a row on its trash button', () => {
      const { onFragmentChange } = renderPanel(setStep('\n  zeta: "1"\n  alpha: "2"'));
      fireEvent.click(screen.getByTestId('workflowStepConfigField-with-add'));
      fireEvent.change(screen.getByTestId('workflowStepConfigField-with-key-2'), {
        target: { value: 'mid' },
      });
      const keys = (lastFragment(onFragmentChange).match(/^ {2}(\w+):/gm) ?? []).map((k) =>
        k.trim()
      );
      expect(keys).toEqual(['zeta:', 'alpha:', 'mid:']);

      fireEvent.click(screen.getByTestId('workflowStepConfigField-with-remove-0'));
      expect(lastFragment(onFragmentChange)).not.toMatch(/zeta/);
      expect(lastFragment(onFragmentChange)).toMatch(/alpha: "2"/);
    });

    it('shows a value that is not text as JSON and keeps its type', () => {
      const { onFragmentChange } = renderPanel(setStep('\n  retries: 5'));
      const cell = screen.getByTestId('workflowStepConfigField-with-value-0');
      expect(cell).toHaveAttribute('data-language', 'json');
      fireEvent.change(activateField('workflowStepConfigField-with-value-0'), {
        target: { value: '7' },
      });
      expect(lastFragment(onFragmentChange)).toMatch(/retries: 7/);
    });

    it('keeps a whole reference typed and writes one inside a sentence as text, on blur', () => {
      // One character short of a whole reference, so the last keystroke completes it.
      const whole = renderPanel(setStep('\n  hits: "{{ steps.search.output.hits }"'));
      const cell = activateField('workflowStepConfigField-with-value-0');
      fireEvent.change(cell, {
        target: { value: '{{ steps.search.output.hits }}', selectionStart: 30, selectionEnd: 30 },
      });
      fireEvent.blur(cell);
      expect(lastFragment(whole.onFragmentChange)).toMatch(
        /hits: \$\{\{ steps\.search\.output\.hits \}\}/
      );
    });

    it('does not rewrite a stored reference just because its cell was focused and left', () => {
      const { onFragmentChange } = renderPanel(setStep("\n  window: \"{{ 'now' | date: '%s' }}\""));
      const before = onFragmentChange.mock.calls.length;
      fireEvent.blur(activateField('workflowStepConfigField-with-value-0'));
      const written = onFragmentChange.mock.calls.slice(before).map(([fragment]) => fragment);
      expect(written.every((fragment) => !fragment.includes('${{'))).toBe(true);
    });

    it('rewrites a value-form reference inside a sentence as text, on blur', () => {
      const sentence = renderPanel(setStep('\n  note: "Found ${{ steps.search.output.total }"'));
      const cell = activateField('workflowStepConfigField-with-value-0');
      fireEvent.change(cell, {
        target: {
          value: 'Found ${{ steps.search.output.total }}',
          selectionStart: 38,
          selectionEnd: 38,
        },
      });
      fireEvent.blur(cell);
      expect(lastFragment(sentence.onFragmentChange)).toMatch(
        /note: Found \{\{ steps\.search\.output\.total \}\}/
      );
    });

    it('edits scalar maps such as HTTP headers as rows too', () => {
      const headerConnectors: ConnectorContractUnion[] = [
        {
          type: 'fetcher',
          hasConnectorId: false,
          paramsSchema: z.object({ headers: z.record(z.string(), z.string()).optional() }),
          outputSchema: z.unknown(),
          summary: 'Fetcher',
          description: null,
        } as unknown as ConnectorContractUnion,
      ];
      renderPanel({
        stepType: 'fetcher',
        connectors: headerConnectors,
        initialFragment:
          'name: f\ntype: fetcher\nwith:\n  headers:\n    Content-Type: application/json\n',
      });
      expect(screen.getByTestId('workflowStepConfigField-with.headers-key-0')).toHaveValue(
        'Content-Type'
      );
      expect(screen.getByTestId('workflowStepConfigField-with.headers-add')).toHaveTextContent(
        'Add field'
      );
    });
  });

  describe('one value or a few', () => {
    const listConnectors: ConnectorContractUnion[] = [
      {
        type: 'lister',
        hasConnectorId: false,
        paramsSchema: z.object({
          index: z.union([z.string(), z.array(z.string())]).optional(),
          tags: z.array(z.string()).optional(),
          status: z.array(z.enum(['open', 'closed'])).optional(),
        }),
        outputSchema: z.unknown(),
        summary: 'Lister',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const renderLister = (withBlock: string) =>
      renderPanel({
        stepType: 'lister',
        connectors: listConnectors,
        initialFragment: `name: l\ntype: lister\nwith:${withBlock}\n`,
      });
    const lastFragment = (spy: jest.Mock) => spy.mock.calls[spy.mock.calls.length - 1][0] as string;
    const searchInput = (testId: string) =>
      within(screen.getByTestId(testId)).getByTestId('comboBoxSearchInput');
    const addTag = (testId: string, text: string) => {
      fireEvent.change(searchInput(testId), { target: { value: text } });
      fireEvent.keyDown(searchInput(testId), { key: 'Enter' });
    };

    it('keeps one value a plain string, makes two a list, and collapses back to one', () => {
      const { onFragmentChange } = renderLister('\n  index: logs-*');
      const field = 'workflowStepConfigField-with.index';
      expect(screen.getByTestId(field)).toHaveTextContent('logs-*');

      addTag(field, 'metrics-*');
      expect(lastFragment(onFragmentChange)).toMatch(/index:\s*\n\s+- logs-\*\n\s+- metrics-\*/);

      // Backspace in the empty input removes the last tag.
      fireEvent.keyDown(searchInput(field), { key: 'Backspace' });
      expect(lastFragment(onFragmentChange)).toMatch(/index: logs-\*/);
    });

    it('keeps a list even down to one value when the schema does not accept a single value', () => {
      const { onFragmentChange } = renderLister('\n  tags: [a, b]');
      const field = 'workflowStepConfigField-with.tags';
      fireEvent.keyDown(searchInput(field), { key: 'Backspace' });
      expect(lastFragment(onFragmentChange)).toMatch(/tags:\s*\n\s+- a/);
      expect(lastFragment(onFragmentChange)).not.toMatch(/tags: a/);
    });

    it('offers only the fixed choices for an enum list', () => {
      const { onFragmentChange } = renderLister('\n  status: [open]');
      addTag('workflowStepConfigField-with.status', 'bogus');
      expect(lastFragment(onFragmentChange)).not.toMatch(/bogus/);
    });

    it('takes the whole list from earlier data and writes the value form', () => {
      const { onFragmentChange } = renderLister('\n  tags: [a]');
      const field = 'workflowStepConfigField-with.tags';
      fireEvent.click(screen.getByTestId(`${field}-source-data`));
      fireEvent.focusIn(screen.getByTestId(`${field}-pick`));
      act(() => {
        insertIntoActiveDataReferenceTarget('{{ steps.find.output.indices }}');
      });
      expect(lastFragment(onFragmentChange)).toMatch(
        /tags: \$\{\{ steps\.find\.output\.indices \}\}/
      );
    });

    describe('a stored text-form reference', () => {
      const constsDefinition = {
        version: '1',
        name: 'demo',
        enabled: true,
        triggers: [{ type: 'manual' }],
        consts: { name: 'logs-*', tags: ['a', 'b'] },
        steps: [{ name: 'l', type: 'lister', with: {} }],
      } as unknown as WorkflowYaml;
      const chipTone = (ref: string) => {
        renderPanel({
          stepType: 'lister',
          connectors: listConnectors,
          workflowDefinition: constsDefinition,
          initialFragment: `name: l\ntype: lister\nwith:\n  index: "${ref}"\n`,
        });
        return screen
          .getByTestId('workflowStepConfigField-with.index-chip')
          .getAttribute('data-tone');
      };

      it('is fine as one string for a field that accepts a single value', () => {
        expect(chipTone('{{ consts.name }}')).toBe('neutral');
        expect(screen.queryByTestId('workflowStepConfigField-with.index-keepType')).toBeNull();
      });

      it('is flagged when the reference is known to be a list', () => {
        expect(chipTone('{{ consts.tags }}')).toBe('warning');
        expect(screen.getByTestId('workflowStepConfigField-with.index-keepType')).toBeVisible();
      });
    });

    it('opens foreach on earlier data when it is empty, and offers Fixed too', () => {
      renderPanel({
        initialFragment:
          'name: loop\ntype: foreach\nforeach: ""\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n',
        stepType: 'foreach',
      });
      expect(screen.getByTestId('workflowStepConfigField-foreach-pick')).toBeInTheDocument();
      expect(
        screen.getByTestId('workflowStepConfigField-foreach-source-fixed')
      ).toBeInTheDocument();
    });

    it('keeps a list of objects in the JSON editor instead of tags', () => {
      renderPanel({
        initialFragment:
          'name: loop\ntype: foreach\nforeach:\n  - id: 1\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n',
        stepType: 'foreach',
      });
      expect(screen.getByTestId('workflowStepConfigField-foreach')).toHaveAttribute(
        'data-language',
        'json'
      );
      expect(
        screen.queryByTestId('workflowStepConfigField-foreach-source-data')
      ).not.toBeInTheDocument();
    });
  });
});
