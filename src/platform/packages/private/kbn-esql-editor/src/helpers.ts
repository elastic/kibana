/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { UseEuiTheme, euiShadow } from '@elastic/eui';
import { css } from '@emotion/react';
import { monaco } from '@kbn/monaco';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { MapCache } from 'lodash';
import {
  EDITOR_MIN_HEIGHT,
  EDITOR_MAX_HEIGHT,
  RESIZABLE_CONTAINER_INITIAL_HEIGHT,
} from './esql_editor.styles';

const KEYCODE_ARROW_UP = 38;
const KEYCODE_ARROW_DOWN = 40;

export type MonacoMessage = monaco.editor.IMarkerData;

interface IntegrationsResponse {
  items: Array<{
    name: string;
    title?: string;
    dataStreams: Array<{
      name: string;
      title?: string;
    }>;
  }>;
}

const INTEGRATIONS_API = '/api/fleet/epm/packages/installed';
const API_VERSION = '2023-10-31';

export const useDebounceWithOptions = (
  fn: Function,
  { skipFirstRender }: { skipFirstRender: boolean } = { skipFirstRender: false },
  ms?: number | undefined,
  deps?: React.DependencyList | undefined
) => {
  const isFirstRender = useRef(true);
  const newDeps = [...(deps || []), isFirstRender];

  return useDebounce(
    () => {
      if (skipFirstRender && isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      return fn();
    },
    ms,
    newDeps
  );
};

const quotedWarningMessageRegexp = /"(.*?)"/g;

export const parseWarning = (warning: string): MonacoMessage[] => {
  if (quotedWarningMessageRegexp.test(warning)) {
    const matches = warning.match(quotedWarningMessageRegexp);
    if (matches) {
      return matches.map((message) => {
        // start extracting the quoted message and with few default positioning
        let warningMessage = message.replace(/"/g, '');
        let startColumn = 1;
        let startLineNumber = 1;
        // initialize the length to 10 in case no error word found
        let errorLength = 10;
        // if there's line number encoded in the message use it as new positioning
        // and replace the actual message without it
        if (/Line (\d+):(\d+):/.test(warningMessage)) {
          const [encodedLine, encodedColumn, innerMessage, additionalInfoMessage] =
            warningMessage.split(':');
          // sometimes the warning comes to the format java.lang.IllegalArgumentException: warning message
          warningMessage = additionalInfoMessage ?? innerMessage;
          if (!Number.isNaN(Number(encodedColumn))) {
            startColumn = Number(encodedColumn);
            startLineNumber = Number(encodedLine.replace('Line ', ''));
          }
          const openingSquareBracketIndex = warningMessage.indexOf('[');
          if (openingSquareBracketIndex !== -1) {
            const closingSquareBracketIndex = warningMessage.indexOf(
              ']',
              openingSquareBracketIndex
            );
            if (closingSquareBracketIndex !== -1) {
              errorLength = warningMessage.length - openingSquareBracketIndex - 1;
            }
          }
        }

        return {
          message: warningMessage.trimStart(),
          startColumn,
          startLineNumber,
          endColumn: startColumn + errorLength - 1,
          endLineNumber: startLineNumber,
          severity: monaco.MarkerSeverity.Warning,
        };
      });
    }
  }
  // unknown warning message
  return [
    {
      message: warning,
      startColumn: 1,
      startLineNumber: 1,
      endColumn: 10,
      endLineNumber: 1,
      severity: monaco.MarkerSeverity.Warning,
    },
  ];
};

export const parseErrors = (errors: Error[], code: string): MonacoMessage[] => {
  return errors.map((error) => {
    if (
      // Found while testing random commands (as inlinestats)
      !error.message.includes('esql_illegal_argument_exception') &&
      error.message.includes('line')
    ) {
      const text = error.message.split('line')[1];
      const [lineNumber, startPosition, errorMessage] = text.split(':');
      // initialize the length to 10 in case no error word found
      let errorLength = 10;
      const [_, wordWithError] = errorMessage.split('[');
      if (wordWithError) {
        errorLength = wordWithError.length - 1;
      }
      return {
        message: errorMessage,
        startColumn: Number(startPosition),
        startLineNumber: Number(lineNumber),
        endColumn: Number(startPosition) + errorLength + 1,
        endLineNumber: Number(lineNumber),
        severity: monaco.MarkerSeverity.Error,
      };
    } else if (error.message.includes('expression was aborted')) {
      return {
        message: i18n.translate('esqlEditor.query.aborted', {
          defaultMessage: 'Request was aborted',
        }),
        startColumn: 1,
        startLineNumber: 1,
        endColumn: 10,
        endLineNumber: 1,
        severity: monaco.MarkerSeverity.Warning,
      };
    } else {
      // unknown error message
      return {
        message: error.message,
        startColumn: 1,
        startLineNumber: 1,
        endColumn: 10,
        endLineNumber: 1,
        severity: monaco.MarkerSeverity.Error,
      };
    }
  });
};

export const getIndicesList = async (dataViews: DataViewsPublicPluginStart) => {
  const indices = await dataViews.getIndices({
    showAllIndices: false,
    pattern: '*',
    isRollupIndex: () => false,
  });

  return indices.map((index) => {
    const [tag] = index?.tags ?? [];
    return { name: index.name, hidden: index.name.startsWith('.'), type: tag?.name ?? 'Index' };
  });
};

export const getRemoteIndicesList = async (dataViews: DataViewsPublicPluginStart) => {
  const indices = await dataViews.getIndices({
    showAllIndices: false,
    pattern: '*:*',
    isRollupIndex: () => false,
  });
  const finalIndicesList = indices.filter((source) => {
    const [_, index] = source.name.split(':');
    return !index.startsWith('.') && !Boolean(source.item.indices);
  });

  return finalIndicesList.map((source) => {
    const [tag] = source?.tags ?? [];
    return { name: source.name, hidden: false, type: tag?.name ?? 'Index' };
  });
};

// refresh the esql cache entry after 10 minutes
const CACHE_INVALIDATE_DELAY = 10 * 60 * 1000;

export const clearCacheWhenOld = (cache: MapCache, esqlQuery: string) => {
  if (cache.has(esqlQuery)) {
    const cacheEntry = cache.get(esqlQuery);
    if (Date.now() - cacheEntry.timestamp > CACHE_INVALIDATE_DELAY) {
      cache.delete(esqlQuery);
    }
  }
};

const getIntegrations = async (core: CoreStart) => {
  const fleetCapabilities = core.application.capabilities.fleet;
  if (!fleetCapabilities?.read) {
    return [];
  }
  // Ideally we should use the Fleet plugin constants to fetch the integrations
  // import { EPM_API_ROUTES, API_VERSIONS } from '@kbn/fleet-plugin/common';
  // but it complicates things as we need to use an x-pack plugin as dependency to get 2 constants
  // and this needs to be done in various places in the codebase which use the editor
  // https://github.com/elastic/kibana/issues/186061
  const response = (await core.http
    .get(INTEGRATIONS_API, { query: { showOnlyActiveDataStreams: true }, version: API_VERSION })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch integrations', error);
    })) as IntegrationsResponse;

  return (
    response?.items
      ?.filter(({ dataStreams }) => dataStreams.length)
      .map((source) => ({
        name: source.name,
        hidden: false,
        title: source.title,
        dataStreams: source.dataStreams,
        type: 'Integration',
      })) ?? []
  );
};

export const getESQLSources = async (dataViews: DataViewsPublicPluginStart, core: CoreStart) => {
  const [remoteIndices, localIndices, integrations] = await Promise.all([
    getRemoteIndicesList(dataViews),
    getIndicesList(dataViews),
    getIntegrations(core),
  ]);
  return [...localIndices, ...remoteIndices, ...integrations];
};

export const onMouseDownResizeHandler = (
  mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.TouchEvent,
  height: number,
  setHeight: (height: number) => void,
  secondPanelHeight?: number,
  setSecondPanelHeight?: (height: number) => void
) => {
  function isMouseEvent(e: React.TouchEvent | React.MouseEvent): e is React.MouseEvent {
    return e && 'pageY' in e;
  }

  const startSize = height;
  const startPosition = isMouseEvent(mouseDownEvent)
    ? mouseDownEvent?.pageY
    : mouseDownEvent?.touches[0].pageY;

  function onMouseMove(mouseMoveEvent: MouseEvent) {
    const h = startSize - startPosition + mouseMoveEvent.pageY;
    const firstPanelHeightValidated = Math.min(Math.max(h, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
    setHeight(firstPanelHeightValidated);
    if (setSecondPanelHeight && secondPanelHeight) {
      const maxHeight = height + secondPanelHeight;
      const secondPanelHeightValidated = Math.min(
        Math.max(maxHeight - firstPanelHeightValidated, RESIZABLE_CONTAINER_INITIAL_HEIGHT),
        maxHeight
      );
      setSecondPanelHeight?.(secondPanelHeightValidated);
    }
  }
  function onMouseUp() {
    document.body.removeEventListener('mousemove', onMouseMove);
  }

  document.body.addEventListener('mousemove', onMouseMove);
  document.body.addEventListener('mouseup', onMouseUp, { once: true });
};

export const onKeyDownResizeHandler = (
  keyDownEvent: React.KeyboardEvent,
  height: number,
  setHeight: (height: number) => void,
  secondPanelHeight?: number,
  setSecondPanelHeight?: (height: number) => void
) => {
  let h = height;
  if (keyDownEvent.keyCode === KEYCODE_ARROW_UP || keyDownEvent.keyCode === KEYCODE_ARROW_DOWN) {
    const step = keyDownEvent.keyCode === KEYCODE_ARROW_UP ? -10 : 10;
    h = h + step;
    const firstPanelHeightValidated = Math.min(Math.max(h, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
    setHeight(firstPanelHeightValidated);
    if (setSecondPanelHeight && secondPanelHeight) {
      const maxHeight = height + secondPanelHeight;
      const secondPanelHeightValidated = Math.min(
        Math.max(maxHeight - firstPanelHeightValidated, RESIZABLE_CONTAINER_INITIAL_HEIGHT),
        maxHeight
      );
      setSecondPanelHeight?.(secondPanelHeightValidated);
    }
  }
};

export const getEditorOverwrites = (theme: UseEuiTheme<{}>) => {
  return css`
    .monaco-hover {
      display: block !important;
    }
    .margin-view-overlays .line-numbers {
      color: ${theme.euiTheme.colors.textDisabled};
    }
    .current-line ~ .line-numbers {
      color: ${theme.euiTheme.colors.textSubdued};
    }

    .suggest-widget,
    .suggest-details-container {
      border-radius: ${theme.euiTheme.border.radius.medium};
      ${euiShadow(theme, 'l')}
    }

    .suggest-details-container {
      background-color: ${theme.euiTheme.colors.backgroundBasePlain};
      line-height: 1.5rem;
    }
    .suggest-details {
      padding-left: ${theme.euiTheme.size.s};
    }
    .monaco-list .monaco-scrollable-element .monaco-list-row.focused {
      border-radius: ${theme.euiTheme.border.radius.medium};
    }
  `;
};
