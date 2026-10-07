/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { waitFor } from '@testing-library/dom';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EsqlSource, registerEsqlSourceInDataViewsCache } from '@kbn/data-source';
import { QuickSearchVisor, type QuickSearchVisorProps } from '.';
import { NL_TEXTAREA_MAX_HEIGHT, visorStyles } from './visor.styles';

jest.mock('@kbn/data-source', () => ({
  ...jest.requireActual('@kbn/data-source'),
  EsqlSource: { create: jest.fn().mockResolvedValue({ id: 'mock-esql-source' }) },
  registerEsqlSourceInDataViewsCache: jest.fn().mockResolvedValue({
    id: 'mock-adhoc-dataview',
    title: 'test_index',
    type: 'esql',
  }),
}));

describe('Quick search visor', () => {
  const corePluginMock = coreMock.createStart();
  const kqlMock = kqlPluginMock.createStartContract();
  (kqlMock.autocomplete.hasQuerySuggestions as jest.Mock).mockReturnValue(true);
  const dataMock = dataPluginMock.createStartContract();

  const services = {
    core: corePluginMock,
    data: dataMock,
    kql: kqlMock,
    esql: {
      getLicense: jest.fn().mockResolvedValue(null),
    },
  };

  function renderESQLVisor(testProps: QuickSearchVisorProps) {
    return (
      <KibanaContextProvider services={services}>
        <QuickSearchVisor {...testProps} />
      </KibanaContextProvider>
    );
  }

  let props: QuickSearchVisorProps;
  beforeEach(() => {
    window.localStorage.clear();
    (corePluginMock.http.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/internal/esql/autocomplete/sources/')) {
        return Promise.resolve([
          { name: 'test_index', hidden: false, type: 'index' },
          { name: 'logs', hidden: false, type: 'index' },
        ]);
      }
      if (url.includes('/internal/inference/connectors')) {
        return Promise.resolve({ connectors: [{ connectorId: 'test-connector' }] });
      }
      return Promise.resolve([]);
    });
    props = {
      query: 'FROM test_index',
      onUpdateAndSubmitQuery: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // `renderWithI18n` wraps in I18nProvider; rerender with it too, or the visor remounts.
  const rerenderVisor = (
    rerender: (ui: React.ReactElement) => void,
    visorProps: QuickSearchVisorProps
  ) => rerender(<I18nProvider>{renderESQLVisor(visorProps)}</I18nProvider>);

  const blurKqlInput = () => {
    const { onChangeQueryInputFocus } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(
      -1
    )[0];
    act(() => onChangeQueryInputFocus(false));
  };

  const lastIndexPatterns = () =>
    (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0].indexPatterns;

  const focusKqlInput = () => {
    const { onChangeQueryInputFocus } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(
      -1
    )[0];
    act(() => onChangeQueryInputFocus(true));
  };

  it('should render the KQL query input', async () => {
    renderWithI18n(renderESQLVisor({ ...props }));

    await waitFor(() => {
      expect(kqlMock.QueryStringInput).toHaveBeenCalled();
    });
  });

  it('looks up the source only once the KQL input is focused, not while the query is typed', async () => {
    const { rerender } = renderWithI18n(renderESQLVisor({ ...props, query: 'FROM l' }));
    rerenderVisor(rerender, { ...props, query: 'FROM lo' });
    rerenderVisor(rerender, { ...props, query: 'FROM logs' });
    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());
    expect(EsqlSource.create).not.toHaveBeenCalled();

    focusKqlInput();

    await waitFor(() => expect(EsqlSource.create).toHaveBeenCalledTimes(1));
    expect(EsqlSource.create).toHaveBeenCalledWith(expect.objectContaining({ query: 'FROM logs' }));
  });

  it('keeps the fields after blur, so refocusing shows them immediately', async () => {
    renderWithI18n(renderESQLVisor({ ...props, query: 'FROM logs' }));
    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());
    focusKqlInput();
    await waitFor(() =>
      expect(lastIndexPatterns()).toEqual([expect.objectContaining({ id: 'mock-adhoc-dataview' })])
    );

    blurKqlInput();
    focusKqlInput();

    expect(lastIndexPatterns()).toEqual([expect.objectContaining({ id: 'mock-adhoc-dataview' })]);
  });

  it('drops the fields of a previous source once focused again', async () => {
    const { rerender } = renderWithI18n(renderESQLVisor({ ...props, query: 'FROM logs' }));
    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());
    focusKqlInput();
    await waitFor(() => expect(lastIndexPatterns()).toHaveLength(1));
    blurKqlInput();

    rerenderVisor(rerender, { ...props, query: 'FROM metrics' });
    // Keep the new lookup pending, to see what is shown meanwhile.
    (EsqlSource.create as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    focusKqlInput();

    expect(lastIndexPatterns()).toEqual([]);
  });

  it('suggests the fields of the queried dataset, not of the query result', async () => {
    renderWithI18n(
      renderESQLVisor({ ...props, query: 'FROM meow1 | STATS count = COUNT(*) BY host' })
    );
    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());
    focusKqlInput();

    await waitFor(() =>
      expect(kqlMock.QueryStringInput).toHaveBeenLastCalledWith(
        expect.objectContaining({
          indexPatterns: [expect.objectContaining({ id: 'mock-adhoc-dataview' })],
        }),
        expect.anything()
      )
    );
    expect(EsqlSource.create).toHaveBeenCalledWith({
      query: 'FROM meow1',
      http: corePluginMock.http,
      resolveTimeField: false,
    });
    expect(registerEsqlSourceInDataViewsCache).toHaveBeenCalledWith(
      dataMock.dataViews,
      { id: 'mock-esql-source' },
      corePluginMock.http
    );
  });

  it('should submit a KQL filter using indexes from the editor query', async () => {
    const onUpdateAndSubmitQuery = jest.fn();
    renderWithI18n(renderESQLVisor({ ...props, onUpdateAndSubmitQuery }));

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onUpdateAndSubmitQuery).toHaveBeenCalledWith(
      'FROM test_index | WHERE KQL("""hostname:web-01""")'
    );
  });

  it('should notify the parent after a KQL filter is submitted so it can focus the editor', async () => {
    const onKqlSubmitted = jest.fn();
    renderWithI18n(renderESQLVisor({ ...props, onKqlSubmitted }));

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onKqlSubmitted).toHaveBeenCalledTimes(1);
  });

  it('should not notify the parent when the KQL submit is ignored', async () => {
    const onKqlSubmitted = jest.fn();
    renderWithI18n(renderESQLVisor({ ...props, isDisabled: true, onKqlSubmitted }));

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onKqlSubmitted).not.toHaveBeenCalled();
  });

  it('should not submit a KQL filter when the editor query has no source', async () => {
    const onUpdateAndSubmitQuery = jest.fn();
    renderWithI18n(renderESQLVisor({ ...props, query: 'ROW x = 1', onUpdateAndSubmitQuery }));

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onUpdateAndSubmitQuery).not.toHaveBeenCalled();
  });

  it('should not submit a KQL filter when the submit action is disabled', async () => {
    const onUpdateAndSubmitQuery = jest.fn();
    renderWithI18n(
      renderESQLVisor({ ...props, disableSubmitAction: true, onUpdateAndSubmitQuery })
    );

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onUpdateAndSubmitQuery).not.toHaveBeenCalled();
  });

  it('should not submit a KQL filter when disabled', async () => {
    const onUpdateAndSubmitQuery = jest.fn();
    renderWithI18n(renderESQLVisor({ ...props, isDisabled: true, onUpdateAndSubmitQuery }));

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onUpdateAndSubmitQuery).not.toHaveBeenCalled();
  });

  it('should build a TS query when the current query uses the TS command', async () => {
    const onUpdateAndSubmitQuery = jest.fn();
    renderWithI18n(renderESQLVisor({ ...props, query: 'TS ts_index', onUpdateAndSubmitQuery }));

    await waitFor(() => expect(kqlMock.QueryStringInput).toHaveBeenCalled());

    const { onSubmit } = (kqlMock.QueryStringInput as jest.Mock).mock.calls.at(-1)[0];
    act(() => onSubmit({ query: 'hostname:web-01', language: 'kuery' }));

    expect(onUpdateAndSubmitQuery).toHaveBeenCalledWith(
      expect.stringMatching(/^TS ts_index \| WHERE KQL/)
    );
  });

  it('should not show a submit button', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await act(async () => {});
    expect(queryByTestId('esqlVisorKQLSubmit')).not.toBeInTheDocument();
  });

  it('should not show a mode selector', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await act(async () => {});
    expect(queryByTestId('esqlVisorModeSelect')).not.toBeInTheDocument();
  });

  it('should not show the Ask AI button when license is not enterprise', async () => {
    const { queryByTestId } = renderWithI18n(renderESQLVisor({ ...props }));
    await act(async () => {});
    expect(queryByTestId('esqlVisorAskAiButton')).not.toBeInTheDocument();
  });

  describe('with enterprise license and connector', () => {
    const enterpriseServices = {
      ...services,
      esql: {
        getLicense: jest.fn().mockResolvedValue({
          status: 'active',
          hasAtLeast: jest.fn().mockReturnValue(true),
          getFeature: jest.fn().mockReturnValue({ isAvailable: false }),
        }),
      },
    };

    function renderWithEnterprise(testProps: QuickSearchVisorProps) {
      return (
        <KibanaContextProvider services={enterpriseServices}>
          <QuickSearchVisor {...testProps} />
        </KibanaContextProvider>
      );
    }

    it('should show the mode buttons when license is enterprise and connector exists', async () => {
      const { getByTestId, getByText } = renderWithI18n(renderWithEnterprise({ ...props }));
      await waitFor(() => {
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
        expect(getByTestId('esqlVisorModeKql')).toBeInTheDocument();
        expect(getByText('Query with AI')).toBeInTheDocument();
      });
      expect(getByTestId('esqlVisorModeKql')).toHaveAttribute('aria-pressed', 'true');
      expect(getByTestId('esqlVisorAskAiButton')).toHaveAttribute('aria-pressed', 'false');
    });

    it('should switch to NL mode when Ask AI is clicked', async () => {
      const { getByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));
      await waitFor(() => {
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });
      expect(getByTestId('esqlVisorNLQueryInput')).toBeInTheDocument();
      expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      expect(getByTestId('esqlVisorModeKql')).toBeInTheDocument();
      expect(getByTestId('esqlVisorModeKql')).toHaveAttribute('aria-pressed', 'false');
      expect(getByTestId('esqlVisorAskAiButton')).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps the visor one row and overlays the focused NL textarea', () => {
      const { result } = renderHook(() => visorStyles(useEuiTheme(), true, true), {
        wrapper: EuiThemeProvider,
      });

      expect(result.current.visorContainer.styles).not.toContain(NL_TEXTAREA_MAX_HEIGHT);
      expect(result.current.nlInput.styles).toContain('.euiTextArea:focus');
      expect(result.current.nlInput.styles).toContain('position:absolute');
      expect(result.current.nlInput.styles).toContain(`max-height:${NL_TEXTAREA_MAX_HEIGHT}`);
    });

    it('expands the NL textarea on focus, grows with multiline input, and collapses on blur', async () => {
      let scrollHeight = 40;
      const scrollHeightSpy = jest
        .spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get')
        .mockImplementation(function (this: HTMLTextAreaElement) {
          return this.getAttribute('data-test-subj') === 'esqlVisorNLQueryInput' ? scrollHeight : 0;
        });

      try {
        const { getByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));
        await waitFor(() => expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument());
        await act(async () => {
          await userEvent.click(getByTestId('esqlVisorAskAiButton'));
        });

        const nlInput = getByTestId('esqlVisorNLQueryInput');
        expect(nlInput.style.height).toBe('');

        await act(async () => {
          nlInput.focus();
        });
        expect(nlInput.style.getPropertyValue('height')).toBe('40px');

        scrollHeight = 96;
        await act(async () => {
          await userEvent.type(
            nlInput,
            'first line{Shift>}{Enter}{/Shift}second line{Shift>}{Enter}{/Shift}third line'
          );
        });
        expect(nlInput).toHaveValue('first line\nsecond line\nthird line');
        expect(nlInput.style.getPropertyValue('height')).toBe('96px');

        await act(async () => {
          nlInput.blur();
        });
        expect(nlInput.style.height).toBe('');
      } finally {
        scrollHeightSpy.mockRestore();
      }
    });

    it('submits natural language when the editor query is empty and submit action is disabled', async () => {
      (corePluginMock.http.post as jest.Mock).mockResolvedValue({
        content: 'FROM logs | LIMIT 10',
      });
      const onNlResult = jest.fn();
      const { getByTestId } = renderWithI18n(
        renderWithEnterprise({ ...props, query: '', disableSubmitAction: true, onNlResult })
      );

      await waitFor(() => expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument());
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });
      await act(async () => {
        await userEvent.type(getByTestId('esqlVisorNLQueryInput'), 'show me logs{enter}');
      });

      await waitFor(() => {
        expect(corePluginMock.http.post).toHaveBeenCalledWith(
          '/internal/esql/nl_to_esql',
          expect.objectContaining({
            body: JSON.stringify({ nlInstruction: 'show me logs', currentQuery: '' }),
          })
        );
      });
      await waitFor(() => expect(onNlResult).toHaveBeenCalledWith('FROM logs | LIMIT 10'));
    });

    it.each([
      ['the submit action is disabled and the editor has a query', { disableSubmitAction: true }],
      ['the visor is disabled and the editor has a query', { isDisabled: true }],
      ['the visor is disabled even if the editor query is empty', { isDisabled: true, query: '' }],
    ])('does not submit natural language when %s', async (_, overrides) => {
      const onNlResult = jest.fn();
      const { getByTestId } = renderWithI18n(
        renderWithEnterprise({ ...props, ...overrides, onNlResult })
      );

      await waitFor(() => expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument());
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });
      await act(async () => {
        await userEvent.type(getByTestId('esqlVisorNLQueryInput'), 'show me logs{enter}');
      });

      expect(corePluginMock.http.post).not.toHaveBeenCalled();
      expect(onNlResult).not.toHaveBeenCalled();
    });

    it('should show the Stop button while NL generation is in progress', async () => {
      (corePluginMock.http.post as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const { getByRole, getByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));

      await waitFor(() => expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument());
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });

      const nlInput = getByTestId('esqlVisorNLQueryInput');
      await act(async () => {
        await userEvent.type(nlInput, 'show me logs{enter}');
      });

      await waitFor(() => expect(getByTestId('esqlVisorStopGeneration')).toBeInTheDocument());
      expect(getByRole('button', { name: 'Stop' })).toBe(getByTestId('esqlVisorStopGeneration'));
    });

    it('should return to KQL mode when the KQL mode button is clicked', async () => {
      const { getByTestId, queryByTestId } = renderWithI18n(renderWithEnterprise({ ...props }));
      await waitFor(() => {
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
      });
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorAskAiButton'));
      });
      expect(getByTestId('esqlVisorNLQueryInput')).toBeInTheDocument();
      await act(async () => {
        await userEvent.click(getByTestId('esqlVisorModeKql'));
      });
      await waitFor(() => {
        expect(queryByTestId('esqlVisorNLQueryInput')).not.toBeInTheDocument();
        expect(getByTestId('esqlVisorAskAiButton')).toBeInTheDocument();
        expect(getByTestId('esqlVisorModeKql')).toBeInTheDocument();
      });
    });
  });
});
