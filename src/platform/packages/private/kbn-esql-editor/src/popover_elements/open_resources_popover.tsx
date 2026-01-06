/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { memoize } from 'lodash';
import { monaco } from '@kbn/monaco';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { Parser } from '@kbn/esql-language';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { PopoverWrapper } from './popover_wrapper';
import { ResourcesArea, RESOURCES_AREA_WIDTH } from './resources_area';
import { findFromStringPosition } from './utils';

/**
 * Hook to register a custom command in the ESQL editor for opening a resources popover.
 * @param editorRef
 * @param editorModel
 * @param query
 * @param getSources
 */
export const useResourcesCommand = (
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>,
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>,
  query: AggregateQuery,
  getSources?: () => Promise<ESQLSourceResult[]>
) => {
  const { euiTheme } = useEuiTheme();
  const popoverRef = useRef<HTMLDivElement>(null);
  const resourcesOpenStatusRef = useRef<boolean>(false);
  const [isPopoverHovered, setIsPopoverHovered] = useState<boolean>(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    top?: number;
    left?: number;
  }>({});
  const [sources, setSources] = useState<ESQLSourceResult[]>([]);
  const isMounted = useMountedState();
  const resourcesBaseBadgeClassName = 'resourcesBadge';

  const resourcesBadgeStyle = css`
    .${resourcesBaseBadgeClassName} {
      cursor: pointer;
      display: inline-block;
      vertical-align: middle;
      padding-block: 0px;
      padding-inline: 2px;
      max-inline-size: 100%;
      font-size: 0.8571rem;
      line-height: 18px;
      font-weight: 500;
      white-space: nowrap;
      text-decoration: none;
      border-radius: 3px;
      text-align: start;
      border-width: 1px;
      border-style: solid;
      color: ${euiTheme.colors.plainLight} !important;
      background-color: ${euiTheme.colors.primary};
    }
  `;

  const openPopover = useCallback(() => {
    // Open popover
    const currentCursorPosition = editorRef.current?.getPosition();
    const editorCoords = editorRef.current?.getDomNode()!.getBoundingClientRect();
    if (currentCursorPosition && editorCoords) {
      const editorPosition = editorRef.current!.getScrolledVisiblePosition(currentCursorPosition);
      const editorTop = editorCoords.top;
      const editorLeft = editorCoords.left;

      // Calculate the absolute position of the popover
      const absoluteTop = editorTop + (editorPosition?.top ?? 0) + 25;
      let absoluteLeft = editorLeft + (editorPosition?.left ?? 0);
      if (absoluteLeft > editorCoords.width) {
        // date picker is out of the editor
        absoluteLeft = absoluteLeft - RESOURCES_AREA_WIDTH;
      }

      setPopoverPosition({ top: absoluteTop, left: absoluteLeft });
      resourcesOpenStatusRef.current = true;
    }
  }, [editorRef, resourcesOpenStatusRef]);

  monaco.editor.registerCommand('esql.resources.open', () => {
    openPopover();
  });

  const getSourcesMemoized = useMemo(
    () => memoize(getSources ?? (() => Promise.resolve([]))),
    [getSources]
  );

  // Runs only once on mount of the HOOK
  useEffect(() => {
    if (Object.keys(popoverPosition).length === 0 || sources.length) {
      // If the popover is not open or there are  sources, we don't need to fetch them again
      return;
    }
    getSourcesMemoized().then((s) => {
      const visibleSources = s.filter((source) => !source.hidden);
      if (!isMounted()) return;
      setSources(visibleSources);
    });
  }, [getSourcesMemoized, isMounted, popoverPosition, sources]);

  const addResourcesDecorator = useCallback(() => {
    // we need to remove the previous decorations first
    const lineCount = editorModel.current?.getLineCount() || 1;
    for (let i = 1; i <= lineCount; i++) {
      const decorations = editorRef.current?.getLineDecorations(i) ?? [];
      editorRef?.current?.removeDecorations(decorations.map((d) => d.id));
    }

    const { root } = Parser.parse(query.esql);
    const fromCommand = root.commands.find((command) => command.name === 'from');
    if (!fromCommand) {
      return;
    }

    const fromStringPosition = findFromStringPosition(query.esql);

    const range = new monaco.Range(
      fromStringPosition.startLineNumber,
      fromStringPosition.min,
      fromStringPosition.endLineNumber,
      fromStringPosition.max
    );

    editorRef?.current?.createDecorationsCollection([
      {
        range,
        options: {
          isWholeLine: false,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          inlineClassName: resourcesBaseBadgeClassName,
        },
      },
    ]);
  }, [editorModel, editorRef, query.esql]);

  useEffect(
    function updateOnQueryChange() {
      addResourcesDecorator();
    },
    [query.esql, addResourcesDecorator]
  );

  const closeResourcesPopover = useCallback(() => {
    if (!isPopoverHovered) {
      setPopoverPosition({});
      resourcesOpenStatusRef.current = false;
    }
  }, [isPopoverHovered]);

  const resourcesLabelClickHandler = useCallback(
    (e: monaco.editor.IEditorMouseEvent) => {
      const mousePosition = e.target.position;
      if (!mousePosition) return;

      const currentWord = editorModel.current?.getWordAtPosition(mousePosition);
      if (!currentWord) return;
      const fromStringPosition = findFromStringPosition(query.esql);

      if (
        currentWord.word === 'FROM' &&
        fromStringPosition.startLineNumber === mousePosition.lineNumber &&
        currentWord.startColumn >= fromStringPosition.min &&
        currentWord.endColumn <= fromStringPosition.max
      ) {
        openPopover();
      } else {
        closeResourcesPopover();
      }
    },
    [closeResourcesPopover, editorModel, openPopover, query.esql]
  );

  const resourcesLabelKeyDownHandler = useCallback(
    (e: monaco.IKeyboardEvent) => {
      const currentPosition = editorRef.current?.getPosition();
      if (!currentPosition) return;
      const currentWord = editorModel.current?.getWordAtPosition(currentPosition);
      if (!currentWord) return;
      const fromStringPosition = findFromStringPosition(query.esql);
      // Open the popover on arrow down key press
      if (
        e.keyCode === monaco.KeyCode.DownArrow &&
        !resourcesOpenStatusRef.current &&
        currentWord.word === 'FROM' &&
        fromStringPosition.startLineNumber === currentPosition.lineNumber &&
        currentWord.startColumn >= fromStringPosition.min &&
        currentWord.endColumn <= fromStringPosition.max
      ) {
        e.preventDefault();
        openPopover();
      }
    },
    [editorModel, editorRef, openPopover, query.esql]
  );

  const MemoizedResourcesPopover = useMemo(() => {
    function ResourcesPopoverInner() {
      const handleKeydown = useCallback((e: KeyboardEvent) => {
        if (
          e.key === 'Escape' &&
          resourcesOpenStatusRef.current &&
          popoverRef.current &&
          popoverRef.current.contains(document.activeElement)
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setPopoverPosition({});
          resourcesOpenStatusRef.current = false;
        }
      }, []);

      const handleMouseEnter = useCallback(() => {
        setIsPopoverHovered(true);
      }, []);

      const handleMouseLeave = useCallback(() => {
        setIsPopoverHovered(false);
      }, []);

      useEffect(() => {
        document.addEventListener('keydown', handleKeydown, true);
        return () => {
          document.removeEventListener('keydown', handleKeydown, true);
        };
      }, [handleKeydown]);

      useEffect(() => {
        if (popoverRef.current && Object.keys(popoverPosition).length > 0) {
          popoverRef.current.focus();
        }
      }, []);

      return (
        <PopoverWrapper
          position={popoverPosition}
          popoverRef={popoverRef}
          dataTestSubj="ESQLEditor-resources-popover"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <ResourcesArea
            editorRef={editorRef}
            editorModel={editorModel}
            sources={sources}
            query={query.esql}
          />
        </PopoverWrapper>
      );
    }
    return React.memo(ResourcesPopoverInner);
  }, [popoverPosition, popoverRef, sources, editorRef, editorModel, query.esql]);

  return {
    addResourcesDecorator,
    resourcesBadgeStyle,
    resourcesLabelClickHandler,
    resourcesLabelKeyDownHandler,
    ResourcesPopover: MemoizedResourcesPopover,
    resourcesOpenStatusRef,
    closeResourcesPopover,
  };
};
