/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormulaIndexPatternColumn } from '../operations';
import type { FormBasedLayer, FormBasedPersistedState, GenericIndexPatternColumn } from '../types';

function isColumnOfType<C extends GenericIndexPatternColumn>(
  type: C['operationType'],
  column: GenericIndexPatternColumn
): column is C {
  return column.operationType === type;
}

export function hasStateFormulaColumn(state: FormBasedPersistedState): boolean {
  return Object.values(state.layers).some((layer) =>
    Object.values(layer.columns).some((column) =>
      isColumnOfType<FormulaIndexPatternColumn>('formula', column)
    )
  );
}

export function getFormulaColumnsFromLayer(layer: Omit<FormBasedLayer, 'indexPatternId'>) {
  return Object.entries(layer.columns).filter(
    (entry): entry is [string, FormulaIndexPatternColumn] =>
      isColumnOfType<FormulaIndexPatternColumn>('formula', entry[1])
  );
}

export function getReferencedColumnIds(
  layer: Omit<FormBasedLayer, 'indexPatternId'>,
  columnId: string
): string[] {
  const referencedIds: string[] = [];
  function collect(id: string) {
    const column = layer.columns[id];
    if (column && 'references' in column) {
      const columnReferences = column.references;
      // only record references which have created columns yet
      const existingReferences = columnReferences.filter((reference) =>
        Boolean(layer.columns[reference])
      );
      referencedIds.push(...existingReferences);
      existingReferences.forEach(collect);
    }
  }
  collect(columnId);

  return referencedIds;
}

export function cleanupFormulaReferenceColumns(
  layer: Omit<FormBasedLayer, 'indexPatternId'>
): Omit<FormBasedLayer, 'indexPatternId'> {
  const newLayer = structuredClone(layer);
  const columnsToFilter = new Set();
  const formulaColumns = getFormulaColumnsFromLayer(newLayer);
  for (const [columnId, column] of formulaColumns) {
    const referencedColumns = getReferencedColumnIds(newLayer, columnId);
    for (const id of referencedColumns) {
      if (newLayer.columns[id]) {
        delete newLayer.columns[id];
        columnsToFilter.add(id);
      }
      delete column.params.isFormulaBroken;
      column.references = [];
    }
  }
  newLayer.columnOrder = newLayer.columnOrder.filter((colId) => !columnsToFilter.has(colId));
  return newLayer;
}
