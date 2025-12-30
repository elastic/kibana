/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BasicPrettyPrinter,
  Parser,
  isSource,
  mutate,
  type ESQLAstItem,
  type ESQLAstJoinCommand,
  type ESQLAstQueryExpression,
  type ESQLSingleAstItem,
  type ESQLSource,
} from '@kbn/esql-language';
import type { monaco } from '@kbn/monaco';

interface SelectedJoin {
  joinCmd: ESQLAstJoinCommand;
  src: ESQLSource | undefined;
  firstArg: ESQLAstItem;
}

type JoinCommandSelector = (root: ESQLAstQueryExpression) => SelectedJoin | undefined;

function modifyJoinCommand(
  root: ESQLAstQueryExpression,
  selectedJoin: SelectedJoin,
  createdIndexName: string
): string {
  const { joinCmd, src, firstArg } = selectedJoin;

  const newSource: ESQLSource = {
    type: 'source',
    sourceType: 'index',
    incomplete: false,
    location: src?.location ?? {
      min: joinCmd.location?.min ?? 0,
      max: (joinCmd.location?.min ?? 0) + createdIndexName.length,
    },
    text: createdIndexName,
    name: createdIndexName,
  };

  if (src) {
    const idx = joinCmd.args.indexOf(firstArg);
    // remove the original argument (source or AS option) from the JOIN command
    mutate.generic.commands.args.remove(root, firstArg as unknown as ESQLSingleAstItem);
    mutate.generic.commands.args.insert(joinCmd, newSource, idx);
  } else {
    mutate.generic.commands.args.insert(joinCmd, newSource, 0);
  }

  return BasicPrettyPrinter.multiline(root);
}

function getJoinSourceInfo(joinCmd: ESQLAstJoinCommand) {
  const firstArg = joinCmd.args[0];
  let src: ESQLSource | undefined;
  if (isSource(firstArg)) {
    src = firstArg;
  } else if (
    firstArg &&
    !Array.isArray(firstArg) &&
    firstArg.type === 'option' &&
    firstArg.name === 'as'
  ) {
    src = firstArg.args[0] as unknown as ESQLSource;
  }
  return { src, firstArg };
}

function byNameSelector(targetName: string): JoinCommandSelector {
  const trimmedTargetName = targetName.trim();
  return (root: ESQLAstQueryExpression) => {
    for (const joinCmd of mutate.commands.join.list(root)) {
      const { src, firstArg } = getJoinSourceInfo(joinCmd);
      if (src?.name === trimmedTargetName) {
        return { joinCmd, src, firstArg };
      }
    }
    return undefined;
  };
}

function byPositionSelector(position: monaco.Position, query: string): JoinCommandSelector {
  const cursorOffset = (() => {
    const { lineNumber, column } = position;
    const lines = query.split('\n');
    let off = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      off += lines[i].length + 1;
    }
    return off + column - 1;
  })();

  return (root: ESQLAstQueryExpression) => {
    let selectedJoin: SelectedJoin | undefined;
    let smallestDistance = Number.MAX_SAFE_INTEGER;

    for (const joinCmd of mutate.commands.join.list(root)) {
      if (joinCmd.location) {
        const { min, max } = joinCmd.location;
        let distance = 0;
        if (cursorOffset < min) distance = min - cursorOffset;
        else if (cursorOffset > max) distance = cursorOffset - max;

        if (distance < smallestDistance) {
          smallestDistance = distance;
          const { src, firstArg } = getJoinSourceInfo(joinCmd);
          selectedJoin = { joinCmd, src, firstArg };
        }
      }
    }
    return selectedJoin;
  };
}

function appendIndexToJoinCommand(
  query: string,
  createdIndexName: string,
  selector: JoinCommandSelector
): string {
  if (!createdIndexName) return query;

  const { root } = Parser.parse(query);
  const selectedJoin = selector(root);

  if (!selectedJoin) return query;

  if (selectedJoin.src && selectedJoin.src.name === createdIndexName) return query;

  return modifyJoinCommand(root, selectedJoin, createdIndexName);
}

export function appendIndexToJoinCommandByName(
  query: string,
  targetName: string,
  createdIndexName: string
): string {
  if (targetName.trim() === createdIndexName) return query;
  return appendIndexToJoinCommand(query, createdIndexName, byNameSelector(targetName));
}

export function appendIndexToJoinCommandByPosition(
  query: string,
  position: monaco.Position,
  createdIndexName: string
): string {
  return appendIndexToJoinCommand(query, createdIndexName, byPositionSelector(position, query));
}
