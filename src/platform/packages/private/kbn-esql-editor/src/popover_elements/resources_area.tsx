/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This is a temporary component to PoC the resources popover.
 */
import React, { useCallback, useRef, useState } from 'react';
import { EuiFieldSearch, EuiListGroup, EuiListGroupItem, EuiText } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { css } from '@emotion/react';
import type { ESQLSourceResult } from '@kbn/esql-types';
import type { ESQLSource } from '@kbn/esql-language';
import { Parser } from '@kbn/esql-language';

export const RESOURCES_AREA_WIDTH = 320;

function insertSubstring(mainString: string, subString: string, index: number): string {
  if (index < 0 || index > mainString.length) {
    throw new Error('Index out of bounds');
  }

  return mainString.slice(0, index) + subString + mainString.slice(index);
}

function getSourceCommandMetadata(query: string):
  | {
      commandEnd: number;
      commandSources: ESQLSource[];
    }
  | undefined {
  const { root } = Parser.parse(query);
  const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
  if (sourceCommand) {
    const args = (sourceCommand?.args ?? []) as ESQLSource[];
    const commandSources = args.filter((arg) => arg.sourceType === 'index' && arg.name);
    return {
      commandSources,
      commandEnd: sourceCommand.location.max,
    };
  }
}

export function ResourcesArea({
  editorRef,
  editorModel,
  query,
  sources = [],
}: {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  query: string;
  sources?: ESQLSourceResult[];
}) {
  const [value, setValue] = useState('');
  const [filteredSources, setFilteredSources] = useState<ESQLSourceResult[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const onChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      const searchValue = String(e.target.value).toLowerCase();
      setFilteredSources(
        sources.filter(
          (source) =>
            source.name.toLowerCase().includes(searchValue) ||
            (source.title && source.title.toLowerCase().includes(searchValue))
        )
      );
      setValue(e.target.value);
    },
    [sources]
  );

  const onSourceClick = useCallback(
    (sourceName: string) => {
      const { commandEnd, commandSources } = getSourceCommandMetadata(query) || {};

      if (!commandEnd || !commandSources) {
        return;
      }

      // If the source is already in the command, do not add it again
      if (commandSources.some((source) => source.name === sourceName)) {
        return;
      }
      const textToInsert = commandSources.length ? `,${sourceName}` : ` ${sourceName}`;
      const currentCursorPosition = editorRef.current?.getPosition();
      const lineNumber = currentCursorPosition?.lineNumber ?? 1;
      const lineContent = editorModel.current?.getLineContent(lineNumber) ?? '';

      const newLineContent = insertSubstring(lineContent, textToInsert, commandEnd + 1);

      editorRef.current?.executeEdits('index', [
        {
          range: new monaco.Range(lineNumber, 0, lineNumber, newLineContent.length + 1),
          text: newLineContent,
          forceMoveMarkers: true,
        },
      ]);
    },
    [editorModel, editorRef, query]
  );

  return (
    <div
      css={css`
        width: ${RESOURCES_AREA_WIDTH}px;
        height: 100%;
        padding: 8px;
      `}
    >
      <EuiText
        size="m"
        css={css`
          padding-bottom: 8px;
          border-bottom: 1px solid #d3dae6;
        `}
      >
        <strong>Data sources</strong>
      </EuiText>
      <div
        ref={scrollContainerRef} // Attach ref to the scrollable div
        css={css`
          padding-top: 8px;
          flex-grow: 1; // Allows it to take up remaining vertical space
          overflow-y: auto; // Make this specific area scrollable
          outline: none; // Remove default focus outline
        `}
      >
        <EuiFieldSearch
          value={value}
          onChange={onChange}
          isClearable
          placeholder="Search..."
          compressed
          id="resources-search"
        />
        <EuiListGroup
          gutterSize="none"
          size="s"
          css={css`
            padding-top: 8px;
          `}
        >
          {(filteredSources.length ? filteredSources : sources).map((source, index) => (
            <EuiListGroupItem
              id={source.name}
              key={source.name}
              label={source.title ?? source.name}
              isActive={query.includes(source.name)}
              extraAction={
                !query.includes(source.name)
                  ? {
                      color: 'text',
                      onClick: () => {
                        onSourceClick(source.name);
                      },
                      iconType: 'plusInCircle',
                      iconSize: 'm',
                      'aria-label': `Add ${source.name}`,
                      alwaysShow: true,
                    }
                  : undefined
              }
            />
          ))}
        </EuiListGroup>
      </div>
    </div>
  );
}
