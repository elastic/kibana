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
import { parseDocument } from 'yaml';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { SET_ALERTS_STATUS_CONTRACT } from '@kbn/workflows/spec/kibana/overrides/kibana.set_alerts_status';
import { z } from '@kbn/zod/v4';
import { resetStepConfigPanelSessionStateForTests, StepConfigPanel } from './step_config_panel';
import { insertIntoActiveDataReferenceTarget } from '../../../shared/lib/active_data_reference_insert_target';

jest.mock('@kbn/code-editor', () => {
  const MockReact = jest.requireActual('react');
  return {
    monaco: {
      languages: {
        getLanguages: () => [],
        register: () => undefined,
        setMonarchTokensProvider: () => undefined,
        setLanguageConfiguration: () => undefined,
      },
    },
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
        executeEdits: (
          source: string,
          edits: Array<{ range: { startColumn: number; endColumn: number }; text: string }>
        ) => void;
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
          // Like Monaco: apply the edit to the (single-line) text and report it as a change.
          executeEdits: (
            _source: string,
            edits: Array<{
              range: { startColumn: number; endColumn: number };
              text: string;
            }>
          ) => {
            const [{ range, text }] = edits;
            const start = range.startColumn - 1;
            const end = range.endColumn - 1;
            const next = `${props.value.slice(0, start)}${text}${props.value.slice(end)}`;
            props.onChange?.(next, { changes: [{ rangeOffset: start, text }] });
          },
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
  // Loops take the panel section, though their canvas node has no fallback port.
  stepSupportsErrorHandlingSettings: (stepType: string | undefined) =>
    Boolean(stepType && !['if', 'parallel', 'merge', 'atomic'].includes(stepType)),
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
  it('renders the instance name as the title', () => {
    renderPanel();
    expect(screen.getByTestId('workflowStepConfigPanelTitle')).toHaveTextContent('notify');
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
    const errorHandling = screen.getByTestId('workflowStepConfigErrorHandlingSection');
    expect(errorHandling).toBeInTheDocument();
    // Error handling is one part of Advanced, so it is titled as a subsection.
    expect(
      within(errorHandling).getByRole('heading', { name: 'Error handling' })
    ).toBeInTheDocument();
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
    expect(screen.getByTestId('workflowStepConfigPanelTypeSubtitle')).toHaveTextContent(/^slack$/);
  });

  describe('field descriptions', () => {
    const SHORT = 'Where to look.';
    const LONG =
      'The full text of a long description that no longer fits in two lines of the panel, ' +
      'and goes on to explain every option in detail.';
    const describedConnectors: ConnectorContractUnion[] = [
      {
        type: 'described',
        hasConnectorId: false,
        paramsSchema: z.object({
          short: z.number().describe(SHORT),
          long: z.number().describe(LONG),
          fixed: z.number().optional().describe(LONG).meta({ templatable: false }),
        }),
        outputSchema: z.unknown(),
        summary: 'Described',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const renderDescribed = (
      fragment = 'name: d\ntype: described\nwith:\n  short: 1\n  long: 2\n'
    ) =>
      renderPanel({
        stepType: 'described',
        connectors: describedConnectors,
        initialFragment: fragment,
      });
    const row = (key: string) =>
      screen
        .getByTestId(`workflowStepConfigField-with.${key}`)
        .closest('.workflowStepConfigFieldRow') as HTMLElement;
    // Generated ids are constant under jest, so find each row's own description element.
    const descriptionIn = (key: string) =>
      row(key).querySelector('[id^="workflowStepConfigDescription"]') as HTMLElement;
    const isDescribedBy = (key: string) =>
      (
        screen
          .getByTestId(`workflowStepConfigField-with.${key}`)
          .getAttribute('aria-describedby') ?? ''
      )
        .split(' ')
        .includes(descriptionIn(key).id);
    const icon = (key: string) =>
      within(row(key)).queryByTestId('workflowStepConfigFieldDescriptionIcon');

    // Number fields are plain EUI inputs, so the row wires `aria-describedby` to them itself.
    // jsdom has no layout, so a description counts as too long once it has more characters than
    // `charsPerTwoLines`: a stand-in for the wrapped height of the hidden, two-line-clamped copy.
    let charsPerTwoLines = 60;
    const resizeCallbacks: Array<() => void> = [];
    const originalResizeObserver = global.ResizeObserver;
    const isMeasurer = (element: HTMLElement) =>
      element.id.startsWith('workflowStepConfigDescription');
    const hasInlineHelp = (key: string) => row(key).querySelector('.euiFormHelpText') !== null;

    beforeEach(() => {
      charsPerTwoLines = 60;
      resizeCallbacks.length = 0;
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get(this: HTMLElement) {
          return isMeasurer(this) ? 36 : 0;
        },
      });
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get(this: HTMLElement) {
          if (!isMeasurer(this)) return 0;
          return (this.textContent?.length ?? 0) > charsPerTwoLines ? 72 : 36;
        },
      });
      global.ResizeObserver = jest.fn().mockImplementation((callback: () => void) => ({
        observe: () => resizeCallbacks.push(callback),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      })) as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
      global.ResizeObserver = originalResizeObserver;
    });

    it('keeps a short description under its control, with no icon', () => {
      renderDescribed();
      expect(within(row('short')).getByText(SHORT, { selector: '.euiFormHelpText' })).toBeVisible();
      expect(icon('short')).toBeNull();
    });

    // The parts of a field's label, in order: title, YAML key and "Optional" when present, icon slot.
    const labelParts = (key: string) =>
      Array.from(
        (row(key).querySelector('label')?.firstElementChild as HTMLElement).children
      ) as HTMLElement[];

    it('moves a long description behind an info icon at the end of the label', () => {
      renderDescribed();
      expect(hasInlineHelp('long')).toBe(false);
      const parts = labelParts('long');
      expect(parts[0]).toHaveTextContent(/^Long$/);
      expect(parts[parts.length - 1]).toContainElement(icon('long'));
    });

    it('puts the icon after the "Optional" marker', () => {
      renderDescribed('name: d\ntype: described\nwith:\n  short: 1\n  long: 2\n  fixed: 3\n');
      const parts = labelParts('fixed');
      expect(parts[parts.length - 2]).toHaveTextContent('Optional');
      expect(parts[parts.length - 1]).toContainElement(icon('fixed'));
    });

    it('does not let a click on the icon reach the control the label points at', () => {
      renderDescribed();
      // `fireEvent` returns false when the event was cancelled, which stops label activation.
      expect(fireEvent.click(icon('long')!)).toBe(false);
    });

    it('keeps the full description attached to the control while it is moved', () => {
      renderDescribed();
      expect(descriptionIn('long')).toHaveTextContent(LONG);
      expect(isDescribedBy('long')).toBe(true);
      // A short one is the row's own help text, which the row wires up itself.
      expect(row('short').querySelector('.euiFormHelpText')).toHaveTextContent(SHORT);
    });

    it('follows the panel width: a description that stops fitting moves behind the icon', () => {
      charsPerTwoLines = 500;
      renderDescribed();
      expect(icon('long')).toBeNull();
      expect(hasInlineHelp('long')).toBe(true);

      charsPerTwoLines = 60;
      act(() => resizeCallbacks.forEach((callback) => callback()));
      expect(icon('long')).toBeInTheDocument();
      expect(hasInlineHelp('long')).toBe(false);
    });

    it('keeps the fixed-only hint under the control when only the description moves', () => {
      renderDescribed('name: d\ntype: described\nwith:\n  short: 1\n  long: 2\n  fixed: 3\n');
      expect(icon('fixed')).toBeInTheDocument();
      expect(
        within(row('fixed')).getByText('Read exactly as typed. Not a template.', {
          selector: '.euiFormHelpText',
        })
      ).toBeInTheDocument();
    });

    it('keeps a moved description reachable while the field shows an error', () => {
      renderDescribed('name: d\ntype: described\nwith:\n  short: 1\n');
      fireEvent.change(activateField('workflowStepConfigField-with.long'), {
        target: { value: '' },
      });
      fireEvent.blur(screen.getByTestId('workflowStepConfigField-with.long'));
      expect(screen.getByTestId('workflowStepConfigField-with.long')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
      expect(icon('long')).toBeInTheDocument();
      expect(isDescribedBy('long')).toBe(true);
    });
  });

  describe('step type subtitle', () => {
    const subtitle = () => screen.getByTestId('workflowStepConfigPanelTypeSubtitle');

    it('shows the raw type id under the name, without the friendly label', () => {
      renderPanel({ actionLabel: 'Slack Message' });
      expect(subtitle()).toHaveTextContent(/^slack$/);
      expect(subtitle().tagName).toBe('CODE');
      expect(subtitle()).toHaveAttribute('title', 'slack');
    });

    it('shows the id of a type the catalog does not know', () => {
      renderPanel({ stepType: 'acme.doSomethingOdd' });
      expect(subtitle()).toHaveTextContent(/^acme\.doSomethingOdd$/);
    });

    it('stays outside the rename button, so clicking it does not edit the name', () => {
      renderPanel({ actionLabel: 'Slack Message' });
      expect(screen.getByTestId('workflowStepConfigPanelTitle')).not.toContainElement(subtitle());
      fireEvent.click(subtitle());
      expect(screen.queryByTestId('workflowStepConfigPanelNameInput')).not.toBeInTheDocument();
    });

    it('stays visible while the name is being edited', () => {
      renderPanel({ actionLabel: 'Slack Message' });
      fireEvent.click(screen.getByTestId('workflowStepConfigPanelTitle'));
      expect(screen.getByTestId('workflowStepConfigPanelNameInput')).toBeInTheDocument();
      expect(subtitle()).toHaveTextContent(/^slack$/);
    });

    it('describes the panel, so the type is announced with the title', () => {
      renderPanel({ actionLabel: 'Slack Message' });
      expect(screen.getByTestId('workflowStepConfigPanel')).toHaveAttribute(
        'aria-describedby',
        subtitle().id
      );
    });
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

  describe('step condition (`if`) in Advanced', () => {
    const baseFragment = 'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n';
    const lastFragment = (spy: jest.Mock) => spy.mock.calls[spy.mock.calls.length - 1][0] as string;

    it('sits above Error handling, with a Condition control', () => {
      renderPanel({ initialFragment: baseFragment });
      expandSettingsAccordion();
      const section = screen.getByTestId('workflowStepConfigConditionSection');
      expect(
        within(section).getByRole('heading', { name: 'Conditional execution' })
      ).toBeInTheDocument();
      expect(within(section).getByTestId('workflowStepConfigField-if')).toBeInTheDocument();
      expect(within(section).getByText('Condition')).toBeInTheDocument();
      const errorHandling = screen.getByTestId('workflowStepConfigErrorHandlingSection');
      expect(section.compareDocumentPosition(errorHandling)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('writes the condition as the step-level `if`, and removes the key when cleared', () => {
      const { onFragmentChange } = renderPanel({ initialFragment: baseFragment });
      expandSettingsAccordion();
      fireEvent.change(activateField('workflowStepConfigField-if'), {
        target: { value: 'steps.a.output.ok : true' },
      });
      const written = parseDocument(lastFragment(onFragmentChange));
      expect(written.get('if')).toBe('steps.a.output.ok : true');
      expect(written.getIn(['with', 'if'])).toBeUndefined();

      fireEvent.change(activateField('workflowStepConfigField-if'), { target: { value: '' } });
      expect(parseDocument(lastFragment(onFragmentChange)).has('if')).toBe(false);
    });

    it('writes a pick into the empty condition as a whole value', () => {
      const { onFragmentChange } = renderPanel({ initialFragment: baseFragment });
      expandSettingsAccordion();
      fireEvent.focusIn(activateField('workflowStepConfigField-if'));
      act(() => {
        insertIntoActiveDataReferenceTarget('{{ steps.a.output.ok }}');
      });
      expect(lastFragment(onFragmentChange)).toMatch(
        /\nif: ["']?\$\{\{ steps\.a\.output\.ok \}\}["']?/
      );
    });

    it('is not offered by the `if` step, which gates on its own condition', () => {
      renderPanel({
        stepType: 'if',
        initialFragment: 'name: branch\ntype: if\ncondition: "true"\n',
        connectors: [],
      });
      expandSettingsAccordion();
      expect(screen.queryByTestId('workflowStepConfigConditionSection')).not.toBeInTheDocument();
    });

    it('is offered next to the note when a step has no error handling', () => {
      renderPanel({ initialFragment: baseFragment, isFallbackStep: true });
      expandSettingsAccordion();
      expect(screen.getByTestId('workflowStepConfigConditionSection')).toBeInTheDocument();
      expect(
        screen.getByText('Error handling is not available for this step.')
      ).toBeInTheDocument();
    });
  });

  describe('step timeout in Advanced', () => {
    const baseFragment = 'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n';
    const lastFragment = (spy: jest.Mock) => spy.mock.calls[spy.mock.calls.length - 1][0] as string;

    it('sits between the Condition and Error handling, with a Duration control', () => {
      renderPanel({ initialFragment: baseFragment });
      expandSettingsAccordion();
      const condition = screen.getByTestId('workflowStepConfigConditionSection');
      const timeout = screen.getByTestId('workflowStepConfigTimeoutSection');
      const errorHandling = screen.getByTestId('workflowStepConfigErrorHandlingSection');
      expect(within(timeout).getByRole('heading', { name: 'Timeout' })).toBeInTheDocument();
      expect(within(timeout).getByTestId('workflowStepConfigField-timeout')).toBeInTheDocument();
      expect(within(timeout).getByText('Duration')).toBeInTheDocument();
      expect(condition.compareDocumentPosition(timeout)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(timeout.compareDocumentPosition(errorHandling)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('writes the duration as the step-level `timeout`, and removes the key when cleared', () => {
      const { onFragmentChange } = renderPanel({ initialFragment: baseFragment });
      expandSettingsAccordion();
      fireEvent.change(activateField('workflowStepConfigField-timeout'), {
        target: { value: '30s' },
      });
      const written = parseDocument(lastFragment(onFragmentChange));
      expect(written.get('timeout')).toBe('30s');
      expect(written.getIn(['with', 'timeout'])).toBeUndefined();

      fireEvent.change(activateField('workflowStepConfigField-timeout'), { target: { value: '' } });
      expect(parseDocument(lastFragment(onFragmentChange)).has('timeout')).toBe(false);
    });

    it('reports a value that is not a duration once the field is left', () => {
      renderPanel({ initialFragment: baseFragment });
      expandSettingsAccordion();
      const input = activateField('workflowStepConfigField-timeout');
      fireEvent.change(input, { target: { value: '5 minutes' } });
      fireEvent.blur(input);
      expect(
        screen.getByText('Must be a duration (e.g. 30s or 1h30m) or a {{ }} template')
      ).toBeInTheDocument();
    });

    it('is a literal duration, with no picker, for a loop', () => {
      renderPanel({
        stepType: 'foreach',
        connectors: [],
        initialFragment:
          'name: loop\ntype: foreach\nforeach: "{{ x }}"\nsteps:\n  - name: a\n    type: console\n    with:\n      message: hi\n',
      });
      expandSettingsAccordion();
      const section = screen.getByTestId('workflowStepConfigTimeoutSection');
      expect(within(section).getByTestId('workflowStepConfigField-timeout')).toBeInTheDocument();
      expect(
        section.querySelector('[data-test-subj="workflowStepConfigDataReference"]')
      ).toBeNull();
    });

    it('is not offered by a step that takes none, which still gets the Condition', () => {
      renderPanel({
        stepType: 'wait',
        connectors: [],
        initialFragment: 'name: w\ntype: wait\nwith:\n  duration: 1s\n',
      });
      expandSettingsAccordion();
      expect(screen.queryByTestId('workflowStepConfigTimeoutSection')).not.toBeInTheDocument();
      expect(screen.getByTestId('workflowStepConfigConditionSection')).toBeInTheDocument();
    });

    it('is not offered, nor is the Condition, for a step inside a parallel branch', () => {
      const definition = {
        version: '1',
        name: 'demo',
        enabled: true,
        triggers: [{ type: 'manual' }],
        steps: [
          {
            name: 'fan',
            type: 'parallel',
            branches: [
              { name: 'a', steps: [{ name: 'n', type: 'slack', 'connector-id': 'a', with: {} }] },
              { name: 'b', steps: [{ name: 'other', type: 'console', with: { message: 'x' } }] },
            ],
          },
        ],
      } as unknown as WorkflowYaml;
      renderPanel({ initialFragment: baseFragment, workflowDefinition: definition });
      expandSettingsAccordion();
      expect(screen.queryByTestId('workflowStepConfigTimeoutSection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('workflowStepConfigConditionSection')).not.toBeInTheDocument();
      expect(screen.getByTestId('workflowStepConfigErrorHandlingSection')).toBeInTheDocument();
    });
  });

  describe('error handling for loops', () => {
    const body = 'steps:\n  - name: a\n    type: console\n    with:\n      message: hi\n';
    const loopFragments = {
      foreach: `name: loop\ntype: foreach\nforeach: "{{ x }}"\n${body}`,
      while: `name: loop\ntype: while\ncondition: "x"\n${body}`,
    };

    it.each(['foreach', 'while'] as const)(
      'offers retry and continue on a %s, worded for the whole loop',
      (stepType) => {
        renderPanel({ stepType, connectors: [], initialFragment: loopFragments[stepType] });
        expandSettingsAccordion();
        const section = screen.getByTestId('workflowStepConfigErrorHandlingSection');
        expect(within(section).getByTestId('workflowStepConfigErrorRetry')).toBeInTheDocument();
        expect(within(section).getByTestId('workflowStepConfigErrorContinue')).toBeInTheDocument();
        expect(
          within(section).getByText('Re-run the whole loop automatically when it fails')
        ).toBeInTheDocument();
        expect(within(section).getByText(/A failing iteration stops the loop/)).toBeInTheDocument();
        expect(
          screen.queryByText('Error handling is not available for this step.')
        ).not.toBeInTheDocument();
      }
    );

    it('writes continue as the loop step-level on-failure, not an iteration one', () => {
      const { onFragmentChange } = renderPanel({
        stepType: 'foreach',
        connectors: [],
        initialFragment: loopFragments.foreach,
      });
      expandSettingsAccordion();
      fireEvent.click(screen.getByTestId('workflowStepConfigErrorContinue'));
      const written = parseDocument(
        onFragmentChange.mock.calls[onFragmentChange.mock.calls.length - 1][0] as string
      ).toJS() as Record<string, unknown>;
      expect(written['on-failure']).toEqual({ continue: true });
      expect(written).not.toHaveProperty('iteration-on-failure');
    });

    it('keeps the plain wording for a step that is not a loop', () => {
      renderPanel({
        initialFragment: 'name: n\ntype: slack\nconnector-id: a\nwith:\n  message: hi\n',
      });
      expandSettingsAccordion();
      expect(screen.getByText('Re-run this step automatically when it fails')).toBeInTheDocument();
    });

    it('still says error handling is not available for an `if` step', () => {
      renderPanel({
        stepType: 'if',
        connectors: [],
        initialFragment: 'name: branch\ntype: if\ncondition: "true"\n',
      });
      expandSettingsAccordion();
      expect(
        screen.queryByTestId('workflowStepConfigErrorHandlingSection')
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Error handling is not available for this step.')
      ).toBeInTheDocument();
    });
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
    // No controls, so no subsection title above the "not available" sentence.
    expect(screen.queryByRole('heading', { name: 'Error handling' })).not.toBeInTheDocument();
    expect(screen.getByText('Error handling is not available for this step.')).toBeInTheDocument();
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

  describe('a JSON + Liquid source (data.parseJson)', () => {
    const parseJsonConnectors: ConnectorContractUnion[] = [
      {
        type: 'data.parseJson',
        hasConnectorId: false,
        paramsSchema: z.object({}),
        configSchema: z.object({
          source: z.unknown().meta({ language: 'json-liquid', advanced: false }),
        }),
        outputSchema: z.unknown(),
        summary: 'Parse JSON',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const definition = {
      version: '1',
      name: 'demo',
      enabled: true,
      triggers: [{ type: 'manual' }],
      consts: { tags: ['a', 'b'] },
      steps: [{ name: 'parse', type: 'data.parseJson', source: '' }],
    } as unknown as WorkflowYaml;

    const renderParseJson = (source: string) => {
      const onFragmentChange = jest.fn();
      render(
        <I18nProvider>
          <StepConfigPanel
            mode="edit"
            stepType="data.parseJson"
            initialFragment={`name: parse\ntype: data.parseJson\nsource: ${JSON.stringify(
              source
            )}\n`}
            connectors={parseJsonConnectors}
            workflowDefinition={definition}
            onClose={jest.fn()}
            onRevert={jest.fn()}
            onFragmentChange={onFragmentChange}
          />
        </I18nProvider>
      );
      const lastSource = () =>
        parseDocument(
          onFragmentChange.mock.calls[onFragmentChange.mock.calls.length - 1][0] as string
        ).get('source');
      return { lastSource };
    };

    it('is an inline JSON + Liquid editor in Configuration, with a picker and an expand control', () => {
      renderParseJson('');
      const field = screen.getByTestId('workflowStepConfigField-source');
      expect(field).toHaveAttribute('data-language', 'json-liquid');
      expect(within(field).getByTestId('mocked-code-editor')).toHaveAttribute(
        'data-language',
        'workflows-json-liquid'
      );
      expect(
        field.querySelector('[data-test-subj="workflowStepConfigDataReference"]')
      ).not.toBeNull();
      expect(
        field.querySelector('[data-test-subj="workflowStepConfigDataReferenceExpand"]')
      ).not.toBeNull();
    });

    it('keeps JSON with Liquid in it as the exact string, without a JSON parse error', () => {
      const { lastSource } = renderParseJson('');
      const text = '{"id": {{ inputs.id }}, "name": "{{ steps.build.output.name }}"}';
      fireEvent.change(
        within(screen.getByTestId('workflowStepConfigField-source')).getByTestId(
          'mocked-code-editor'
        ),
        { target: { value: text } }
      );
      expect(lastSource()).toBe(text);
      expect(screen.queryByText('Must be valid JSON')).not.toBeInTheDocument();
    });

    it('reports JSON that is broken once the variables are filled in', () => {
      renderParseJson('');
      const editor = within(screen.getByTestId('workflowStepConfigField-source')).getByTestId(
        'mocked-code-editor'
      );
      fireEvent.change(editor, { target: { value: '{"a": }' } });
      fireEvent.blur(editor);
      expect(screen.getByText('Must be valid JSON (ignoring variables)')).toBeInTheDocument();
    });

    it('shows a structured value written as a map in YAML as JSON text', () => {
      const onFragmentChange = jest.fn();
      render(
        <I18nProvider>
          <StepConfigPanel
            mode="edit"
            stepType="data.parseJson"
            initialFragment={'name: parse\ntype: data.parseJson\nsource:\n  a: 1\n'}
            connectors={parseJsonConnectors}
            onClose={jest.fn()}
            onRevert={jest.fn()}
            onFragmentChange={onFragmentChange}
          />
        </I18nProvider>
      );
      expect(
        (
          within(screen.getByTestId('workflowStepConfigField-source')).getByTestId(
            'mocked-code-editor'
          ) as HTMLTextAreaElement
        ).value
      ).toBe(JSON.stringify({ a: 1 }, null, 2));
    });

    it('offers to insert a list in the middle of the text as JSON text', () => {
      const { lastSource } = renderParseJson('{"tags": {{ consts.tags }}}');
      expect(screen.getByTestId('workflowStepConfigField-source-containerCallout')).toBeVisible();
      fireEvent.click(screen.getByTestId('workflowStepConfigField-source-insertAsJson'));
      expect(lastSource()).toBe('{"tags": {{ consts.tags | json }}}');
    });

    it('does not warn about a list that is the whole value', () => {
      renderParseJson('${{ consts.tags }}');
      expect(
        screen.queryByTestId('workflowStepConfigField-source-containerCallout')
      ).not.toBeInTheDocument();
    });
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
      // The number way of the max-iterations choice.
      expect(field).toHaveValue(10);
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

    it('does not flag a whole value-form reference just because JSON quotes it', () => {
      renderPanel({
        initialFragment:
          'name: n\ntype: slack\nconnector-id: abc\nwith:\n  message: hi\n  query:\n    value: "${{ inputs.x }}"\n',
      });
      const chip = within(screen.getByTestId('workflowStepConfigField-with.query')).getByTestId(
        'workflowReferenceChip'
      );
      expect(chip).toHaveAttribute('data-tone', 'neutral');
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

    it('draws a reference tag as a pill with the type the workflow gives it, and writes it back as stored', () => {
      const definition = {
        version: '1',
        name: 'demo',
        enabled: true,
        triggers: [{ type: 'manual' }],
        consts: { owner: 'ana' },
        steps: [{ name: 'l', type: 'lister', with: {} }],
      } as unknown as WorkflowYaml;
      const { onFragmentChange } = renderPanel({
        stepType: 'lister',
        connectors: listConnectors,
        workflowDefinition: definition,
        initialFragment:
          'name: l\ntype: lister\nwith:\n  tags:\n    - "{{ consts.owner }}"\n    - plain\n',
      });
      const field = within(screen.getByTestId('workflowStepConfigField-with.tags'));

      expect(field.getByText('consts.owner')).toBeInTheDocument();
      expect(screen.getByTestId('workflowStepConfigField-with.tags')).not.toHaveTextContent('{{');
      expect(field.getAllByTestId('euiComboBoxPill')[0]).toHaveAttribute(
        'title',
        'consts.owner\nstring · written as text'
      );

      addTag('workflowStepConfigField-with.tags', 'extra');
      expect(lastFragment(onFragmentChange)).toMatch(
        /- "\{\{ consts\.owner \}\}"\n\s+- plain\n\s+- extra/
      );
    });

    describe('data as an entry of a list field', () => {
      const definition = {
        version: '1',
        name: 'demo',
        enabled: true,
        triggers: [{ type: 'manual' }],
        consts: { owner: 'ana', tags: ['a', 'b'] },
        steps: [{ name: 'l', type: 'lister', with: {} }],
      } as unknown as WorkflowYaml;
      const testId = (field: string) => `workflowStepConfigField-with.${field}`;
      const renderEntries = (withBlock: string) =>
        renderPanel({
          stepType: 'lister',
          connectors: listConnectors,
          workflowDefinition: definition,
          initialFragment: `name: l\ntype: lister\nwith:${withBlock}\n`,
        });
      // Picks through the data button on the tags box, as the picker's insert would.
      const pickEntry = (field: string, token: string) => {
        fireEvent.focusIn(screen.getByTestId(`${testId(field)}-pick`));
        act(() => {
          insertIntoActiveDataReferenceTarget(token);
        });
      };

      it('names the two sides of a list Entries and From data, and leaves the other fields alone', () => {
        renderEntries('\n  tags: [a]');
        const switchOf = (field: string) => screen.getByTestId(`${testId(field)}-source`);
        expect(switchOf('tags')).toHaveTextContent('Entries');
        expect(switchOf('tags')).toHaveTextContent('From data');
        expect(switchOf('tags')).not.toHaveTextContent('Fixed');
      });

      it('adds a single value as an entry, as text, after the entries already there', () => {
        const { onFragmentChange } = renderEntries('\n  tags: [a, b]');
        pickEntry('tags', '{{ consts.owner }}');
        const saved = lastFragment(onFragmentChange);
        expect(saved).toMatch(/- a\n\s+- b\n\s+- "\{\{ consts\.owner \}\}"/);
        expect(saved).not.toContain('${{');
        expect(within(screen.getByTestId(testId('tags'))).getByText('consts.owner')).toBeVisible();
        expect(screen.getByTestId(`${testId('tags')}-source-fixed`)).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });

      it('adds a reference of unknown type as an entry too', () => {
        const { onFragmentChange } = renderEntries('\n  tags: [a]');
        pickEntry('tags', '{{ inputs.unknown }}');
        expect(lastFragment(onFragmentChange)).toMatch(/- a\n\s+- "\{\{ inputs\.unknown \}\}"/);
      });

      it('does not add an entry that is already there', () => {
        const { onFragmentChange } = renderEntries(
          '\n  tags:\n    - "{{ consts.owner }}"\n    - plain'
        );
        pickEntry('tags', '{{ consts.owner }}');
        const saved = lastFragment(onFragmentChange);
        expect(saved.match(/consts\.owner/g) ?? []).toHaveLength(1);
        expect(saved).toContain('- plain');
      });

      it('uses a known list as the whole list when there are no entries yet', () => {
        // An empty optional list is hidden, so empty the only entry instead of starting empty.
        const { onFragmentChange } = renderEntries('\n  tags: [a]');
        fireEvent.keyDown(
          within(screen.getByTestId(testId('tags'))).getByTestId('comboBoxSearchInput'),
          {
            key: 'Backspace',
          }
        );
        pickEntry('tags', '{{ consts.tags }}');
        expect(lastFragment(onFragmentChange)).toMatch(/tags: "?\$\{\{ consts\.tags \}\}"?/);
        expect(screen.getByTestId(`${testId('tags')}-source-data`)).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        expect(screen.queryByTestId(`${testId('tags')}-replaceConfirm`)).not.toBeInTheDocument();
      });

      it('asks before a known list replaces the entries, and keeps them on Cancel', () => {
        const { onFragmentChange } = renderEntries('\n  tags: [a, b]');
        const writes = onFragmentChange.mock.calls.length;
        pickEntry('tags', '{{ consts.tags }}');
        expect(screen.getByTestId(`${testId('tags')}-replaceConfirm`)).toBeInTheDocument();
        expect(onFragmentChange.mock.calls.length).toBe(writes);

        fireEvent.click(
          within(screen.getByTestId(`${testId('tags')}-replaceConfirm`)).getByText('Cancel')
        );
        expect(screen.queryByTestId(`${testId('tags')}-replaceConfirm`)).not.toBeInTheDocument();
        expect(onFragmentChange.mock.calls.length).toBe(writes);
        expect(within(screen.getByTestId(testId('tags'))).getByText('b')).toBeInTheDocument();
      });

      it('replaces the entries with the known list once confirmed', () => {
        const { onFragmentChange } = renderEntries('\n  tags: [a, b]');
        pickEntry('tags', '{{ consts.tags }}');
        fireEvent.click(
          within(screen.getByTestId(`${testId('tags')}-replaceConfirm`)).getByText('Replace')
        );
        expect(lastFragment(onFragmentChange)).toMatch(/tags: "?\$\{\{ consts\.tags \}\}"?/);
        expect(screen.getByTestId(`${testId('tags')}-source-data`)).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });

      it('offers no data button on a list with fixed choices', () => {
        renderEntries('\n  status: [open]');
        expect(screen.queryByTestId(`${testId('status')}-pick`)).not.toBeInTheDocument();
      });
    });

    describe('the whole-list side of a list field', () => {
      const definition = {
        version: '1',
        name: 'demo',
        enabled: true,
        triggers: [{ type: 'manual' }],
        consts: { owner: 'ana', tags: ['a', 'b'] },
        steps: [{ name: 'l', type: 'lister', with: {} }],
      } as unknown as WorkflowYaml;
      // `tags` is array-only; `index` also accepts a single value.
      const pickWhole = (withBlock: string, field: string, token: string) => {
        const view = renderPanel({
          stepType: 'lister',
          connectors: listConnectors,
          workflowDefinition: definition,
          initialFragment: `name: l\ntype: lister\nwith:${withBlock}\n`,
        });
        const testId = `workflowStepConfigField-with.${field}`;
        fireEvent.click(screen.getByTestId(`${testId}-source-data`));
        fireEvent.focusIn(screen.getByTestId(`${testId}-pick`));
        act(() => {
          insertIntoActiveDataReferenceTarget(token);
        });
        return { ...view, testId };
      };

      it('adds a known single value as an entry, after the entries already there, when the field needs a list', () => {
        const { onFragmentChange, testId } = pickWhole(
          '\n  tags: [a, b]',
          'tags',
          '{{ consts.owner }}'
        );
        const saved = lastFragment(onFragmentChange);
        expect(saved).toMatch(/- a\n\s+- b\n\s+- "\{\{ consts\.owner \}\}"/);
        expect(saved).not.toContain('${{');
        // Back on the entries, where the reference reads as a pill.
        expect(within(screen.getByTestId(testId)).getByText('consts.owner')).toBeInTheDocument();
      });

      it('does not add an entry that is already there', () => {
        const { onFragmentChange } = pickWhole(
          '\n  tags:\n    - "{{ consts.owner }}"\n    - plain',
          'tags',
          '{{ consts.owner }}'
        );
        const saved = lastFragment(onFragmentChange);
        expect(saved.match(/consts\.owner/g) ?? []).toHaveLength(1);
        expect(saved).toContain('- plain');
      });

      it('writes a known list as the whole value', () => {
        const { onFragmentChange } = pickWhole('\n  tags: [a]', 'tags', '{{ consts.tags }}');
        expect(lastFragment(onFragmentChange)).toMatch(/tags: \$\{\{ consts\.tags \}\}/);
      });

      it('writes a reference of unknown type as the whole value, as before', () => {
        const { onFragmentChange } = pickWhole('\n  tags: [a]', 'tags', '{{ inputs.unknown }}');
        expect(lastFragment(onFragmentChange)).toMatch(/tags: \$\{\{ inputs\.unknown \}\}/);
      });

      it('still writes a single value as the value when the field accepts one', () => {
        const { onFragmentChange } = pickWhole('\n  index: logs-*', 'index', '{{ consts.owner }}');
        expect(lastFragment(onFragmentChange)).toMatch(/index: \$\{\{ consts\.owner \}\}/);
      });
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

  describe('condition of if and while', () => {
    const body = 'steps:\n  - name: a\n    type: console\n    with:\n      message: hi\n';
    const renderCondition = (stepType: string, condition: string) =>
      renderPanel({
        stepType,
        initialFragment: `name: gate\ntype: ${stepType}\ncondition: ${condition}\n${body}`,
      });
    const lastFragment = (spy: jest.Mock) => spy.mock.calls[spy.mock.calls.length - 1][0] as string;
    const pick = (token: string) => {
      // The read view gives way to the editor on focus; claim the insert target on the live one.
      fireEvent.focusIn(activateField('workflowStepConfigField-condition'));
      act(() => {
        insertIntoActiveDataReferenceTarget(token);
      });
    };

    it('writes a pick into an empty if condition as a whole value', () => {
      const { onFragmentChange } = renderCondition('if', '""');
      pick('{{ steps.a.output.ok }}');
      expect(lastFragment(onFragmentChange)).toMatch(
        /condition: ["']?\$\{\{ steps\.a\.output\.ok \}\}["']?/
      );
    });

    it('does the same for a while condition', () => {
      const { onFragmentChange } = renderCondition('while', '""');
      pick('{{ steps.a.output.ok }}');
      expect(lastFragment(onFragmentChange)).toMatch(
        /condition: ["']?\$\{\{ steps\.a\.output\.ok \}\}["']?/
      );
    });

    it('keeps the safe literal form once the condition already holds KQL', () => {
      const { onFragmentChange } = renderCondition('if', '"status : "');
      pick('{{ steps.a.output.status }}');
      const saved = lastFragment(onFragmentChange);
      expect(saved).toContain('{{ steps.a.output.status }}');
      expect(saved).not.toContain('${{');
    });

    it('keeps the value form when a pick replaces the only reference', () => {
      const { onFragmentChange } = renderCondition('if', '"${{ steps.a.output.ok }}"');
      fireEvent.click(
        within(screen.getByTestId('workflowStepConfigField-condition')).getByTestId(
          'workflowReferenceChip'
        )
      );
      act(() => {
        insertIntoActiveDataReferenceTarget('{{ steps.b.output.ok }}');
      });
      expect(lastFragment(onFragmentChange)).toMatch(
        /condition: ["']?\$\{\{ steps\.b\.output\.ok \}\}["']?/
      );
    });
  });

  describe('Map Collection', () => {
    const mapConnectors: ConnectorContractUnion[] = [
      {
        type: 'data.map',
        hasConnectorId: false,
        configSchema: z.object({ items: z.unknown().meta({ advanced: false, preferData: true }) }),
        paramsSchema: z.object({
          fields: z
            .record(z.string(), z.union([z.string(), z.object({ a: z.string() })]))
            .meta({ keyValue: true }),
        }),
        outputSchema: z.unknown(),
        summary: 'Map Collection',
        description: null,
      } as unknown as ConnectorContractUnion,
    ];
    const renderMapper = (fragment: string) =>
      renderPanel({ stepType: 'data.map', connectors: mapConnectors, initialFragment: fragment });
    const lastFragment = (spy: jest.Mock) => spy.mock.calls[spy.mock.calls.length - 1][0] as string;

    it('shows Fields as name/value rows, with a record value left as JSON', () => {
      renderMapper(
        'name: mapper\ntype: data.map\nitems: ""\nwith:\n  fields:\n    id: "{{ item.id }}"\n    owner:\n      a: x\n'
      );
      expect(screen.getByTestId('workflowStepConfigField-with.fields-key-0')).toHaveValue('id');
      expect(screen.getByTestId('workflowStepConfigField-with.fields-key-1')).toHaveValue('owner');
      expect(screen.getByTestId('workflowStepConfigField-with.fields-value-1')).toHaveAttribute(
        'data-language',
        'json'
      );
      expect(screen.getByTestId('workflowStepConfigField-with.fields-add')).toHaveTextContent(
        'Add field'
      );
    });

    it('opens Items on earlier data when it is empty, and offers Fixed too', () => {
      renderMapper('name: mapper\ntype: data.map\nitems: ""\nwith:\n  fields:\n    id: x\n');
      expect(screen.getByTestId('workflowStepConfigField-items-pick')).toBeInTheDocument();
      expect(screen.getByTestId('workflowStepConfigField-items-source-fixed')).toBeInTheDocument();
    });

    it('does not mark Items as required', () => {
      renderMapper('name: mapper\ntype: data.map\nitems: ""\nwith:\n  fields:\n    id: x\n');
      expect(screen.queryByText('Items is required')).not.toBeInTheDocument();
    });

    it('writes a whole reference as a value, and goes back to a JSON editor on Fixed', () => {
      const { onFragmentChange } = renderMapper(
        'name: mapper\ntype: data.map\nitems: ""\nwith:\n  fields:\n    id: x\n'
      );
      fireEvent.focusIn(screen.getByTestId('workflowStepConfigField-items-pick'));
      act(() => {
        insertIntoActiveDataReferenceTarget('{{ steps.fetch.output.hits }}');
      });
      expect(lastFragment(onFragmentChange)).toMatch(
        /items: ["']?\$\{\{ steps\.fetch\.output\.hits \}\}["']?/
      );

      fireEvent.click(screen.getByTestId('workflowStepConfigField-items-source-fixed'));
      expect(lastFragment(onFragmentChange)).not.toMatch(/items/);
      expect(screen.getByTestId('workflowStepConfigField-items')).toHaveAttribute(
        'data-language',
        'json'
      );
    });

    it('keeps a literal list of items in the JSON editor, with the switch to Data available', () => {
      renderMapper(
        'name: mapper\ntype: data.map\nitems:\n  - id: 1\nwith:\n  fields:\n    id: x\n'
      );
      expect(screen.getByTestId('workflowStepConfigField-items')).toHaveAttribute(
        'data-language',
        'json'
      );
      expect(screen.getByTestId('workflowStepConfigField-items-source-data')).toBeInTheDocument();
    });
  });

  describe('choosing how to write a value', () => {
    const loop = (extra: string) =>
      renderPanel({
        stepType: 'while',
        initialFragment: `name: w\ntype: while\ncondition: x\n${extra}steps:\n  - name: a\n    type: console\n    with:\n      message: hi\n`,
      });
    const group = 'workflowStepConfigField-max-iterations-variantGroup';
    const way = (index: number) => screen.getByTestId(`${group}-variant-variant-${index}`);
    const isChosen = (element: HTMLElement) => element.getAttribute('aria-pressed') === 'true';
    const lastFragment = (spy: jest.Mock) => spy.mock.calls[spy.mock.calls.length - 1][0] as string;

    it('shows the way a stored value is written, from the value', () => {
      loop('max-iterations: 10\n');
      expect(isChosen(way(0))).toBe(true);
      expect(screen.getByTestId('workflowStepConfigField-max-iterations')).toHaveValue(10);
    });

    it('infers the object way from a stored object, and shows its fields', () => {
      loop('max-iterations:\n  limit: 5\n  on-limit: fail\n');
      expect(isChosen(way(1))).toBe(true);
      expect(screen.getByTestId('workflowStepConfigField-max-iterations.limit')).toHaveValue(5);
    });

    it('asks before replacing a value, and keeps it on Cancel', () => {
      const { onFragmentChange } = loop('max-iterations: 10\n');
      fireEvent.click(way(1));
      const modal = screen.getByTestId(`${group}-confirm`);
      expect(modal).toHaveTextContent('Replace current value?');
      expect(modal).toHaveTextContent('Switching to "Limit + behavior" replaces it');
      fireEvent.click(within(modal).getByText('Cancel'));
      expect(screen.queryByTestId(`${group}-confirm`)).not.toBeInTheDocument();
      expect(isChosen(way(0))).toBe(true);
      expect(
        onFragmentChange.mock.calls.every(([f]) => /max-iterations: 10/.test(f as string))
      ).toBe(true);
    });

    it('replaces the value on Switch, then writes the new way’s fields', () => {
      const { onFragmentChange } = loop('max-iterations: 10\n');
      fireEvent.click(way(1));
      fireEvent.click(within(screen.getByTestId(`${group}-confirm`)).getByText('Switch'));
      expect(isChosen(way(1))).toBe(true);
      expect(lastFragment(onFragmentChange)).not.toMatch(/max-iterations/);

      fireEvent.change(screen.getByTestId('workflowStepConfigField-max-iterations.limit'), {
        target: { value: '5' },
      });
      expect(lastFragment(onFragmentChange)).toMatch(/max-iterations:\s*\n\s+limit: 5/);
    });

    it('switches without asking when there is nothing to replace', () => {
      loop('');
      fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalField'));
      fireEvent.click(screen.getByTestId('workflowStepConfigAddOptionalOption-max-iterations'));
      expect(isChosen(way(0))).toBe(true);
      fireEvent.click(way(1));
      expect(screen.queryByTestId(`${group}-confirm`)).not.toBeInTheDocument();
      expect(isChosen(way(1))).toBe(true);
      expect(
        screen.getByTestId('workflowStepConfigField-max-iterations.limit')
      ).toBeInTheDocument();
    });

    it('offers no references for the fixed-only fields of either way', () => {
      loop('max-iterations:\n  limit: 5\n  on-limit: fail\n');
      const limit = screen.getByTestId('workflowStepConfigField-max-iterations.limit');
      const row = limit.closest('.workflowStepConfigFieldRow') as HTMLElement;
      expect(
        within(row).queryByTestId('workflowStepConfigField-max-iterations.limit-source-data')
      ).not.toBeInTheDocument();
    });

    it('shows SetAlertsStatus as a choice between by IDs and by query', () => {
      renderPanel({
        stepType: 'kibana.SetAlertsStatus',
        connectors: [SET_ALERTS_STATUS_CONTRACT as unknown as ConnectorContractUnion],
        initialFragment:
          'name: s\ntype: kibana.SetAlertsStatus\nwith:\n  status: closed\n  signal_ids:\n    - abc\n',
      });
      const withGroup = 'workflowStepConfigField-with-variantGroup';
      expect(
        screen.getByTestId(`${withGroup}-variant-variant-0`).getAttribute('aria-pressed')
      ).toBe('true');
      expect(screen.getByTestId('workflowStepConfigField-with.signal_ids')).toHaveTextContent(
        'abc'
      );
      expect(screen.queryByTestId('workflowStepConfigField-with.query')).not.toBeInTheDocument();
      expect(screen.getByText('Query')).toBeInTheDocument();
    });
  });
});
