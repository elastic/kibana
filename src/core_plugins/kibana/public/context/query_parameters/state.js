export function createInitialQueryParametersState(defaultStepSize) {
  return {
    anchorUid: null,
    columns: [],
    defaultStepSize,
    filters: [],
    indexPatternId: null,
    predecessorCount: 0,
    successorCount: 0,
    sort: [],
  };
}
