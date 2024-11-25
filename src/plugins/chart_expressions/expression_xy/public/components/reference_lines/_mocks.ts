/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxisConfiguration, mapVerticalToHorizontalPlacement } from '../../helpers';

function createCombinationsFrom(strings: string): string[] {
  return strings.split('').flatMap((str, i, allStrings) => [
    str,
    ...allStrings.slice(i + 1).flatMap((otherStr, _, rest) => {
      return rest.length < 2
        ? `${str}${otherStr}`
        : createCombinationsFrom(rest.join('')).map((comb) => `${str}${comb}`);
    }),
  ]);
}

const DEFAULT_PADDING = 20;
const stringToPos = { l: 'left', r: 'right', b: 'bottom', t: 'top' } as const;
const stringToAxesId = { l: 'yLeft', r: 'yRight', x: 'x' } as const;
const posToId = { left: 'yLeft', right: 'yRight', bottom: 'x' } as const;

export type StringPos = keyof typeof stringToPos;
export type PosType = (typeof stringToPos)[StringPos];

export type StringId = keyof typeof stringToAxesId;
export type AxisTypeId = (typeof stringToAxesId)[StringId];

function buildPositionObject<T extends unknown>(
  posString: string,
  value: T
): Partial<Record<PosType, T>> {
  const obj: Partial<Record<PosType, T>> = {};
  for (const str of posString.split('') as unknown as StringPos[]) {
    obj[stringToPos[str]] = value;
  }
  return obj;
}

function buildAxesIdObject(idsString: string): Partial<Record<AxisTypeId, boolean>> {
  const obj: Partial<Record<AxisTypeId, boolean>> = {};
  for (const str of idsString.split('') as unknown as StringId[]) {
    obj[stringToAxesId[str]] = true;
  }
  return obj;
}

export function computeInputCombinations() {
  return [{ referencePaddings: 'lrbt', labels: 'lrx', titles: 'lrx', axes: 'lr' }].flatMap(
    ({ referencePaddings, labels, titles, axes }) => {
      // create all combinations of reference line paddings
      // l, r, ..., lr, lb, lt, lrb, ...
      const paddings = Array.from(new Set(createCombinationsFrom(referencePaddings)));
      const axisLabels = Array.from(new Set(createCombinationsFrom(labels)));
      const axisTitles = Array.from(new Set(createCombinationsFrom(titles)));
      const axesMap = Array.from(new Set(createCombinationsFrom(axes)));

      const allCombinations = [];
      for (const p of paddings) {
        const pObj = buildPositionObject(p, DEFAULT_PADDING);
        for (const l of axisLabels) {
          const lObj = buildAxesIdObject(l);
          for (const t of axisTitles) {
            const tObj = buildAxesIdObject(t);
            for (const a of axesMap) {
              const aObj = buildPositionObject(a, {} as AxisConfiguration);
              // Add undefined values for missing axes
              for (const emptyAxis of ['left', 'right'] as const) {
                if (!(emptyAxis in aObj)) {
                  aObj[emptyAxis] = undefined;
                }
              }
              for (const horizontal of [false, true]) {
                const result: Partial<Record<PosType, number>> = {};
                for (const pos of Object.keys(pObj) as PosType[]) {
                  const id = pos in posToId ? posToId[pos as Exclude<PosType, 'top'>] : null;
                  const isHorizontalAndLeftOrRight = pos in aObj && (horizontal || !aObj[pos]);
                  const isTop = !id;
                  const hasNoLabelAndTitle = id && !lObj[id] && !tObj[id];
                  if (isHorizontalAndLeftOrRight || isTop || hasNoLabelAndTitle) {
                    result[horizontal ? mapVerticalToHorizontalPlacement(pos) : pos] = pObj[pos];
                  }
                }
                allCombinations.push({
                  referencePadding: pObj,
                  labels: lObj,
                  titles: tObj,
                  axesMap: aObj,
                  isHorizontal: horizontal,
                  id: `[Paddings: ${p}][Labels: ${l}][Titles: ${t}][Axes: ${a}]${
                    horizontal ? '[isHorizontal]' : ''
                  }`,
                  result,
                });
              }
            }
          }
        }
      }
      return allCombinations;
    }
  );
}
