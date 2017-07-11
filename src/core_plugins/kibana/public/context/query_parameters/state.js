export function createInitialQueryParametersState(defaultStepSize, tieBreakerField) {
  return {
    anchorUid: null,
    columns: [],
    defaultStepSize,
    indexPattern: null,
    predecessorCount: 0,
    successorCount: 0,
    sort: [],
    tieBreakerField,
  };
}
