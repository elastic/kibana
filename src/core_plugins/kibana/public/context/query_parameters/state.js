export function createInitialQueryParametersState(defaultStepSize) {
  return {
    anchorUid: null,
    columns: [],
    defaultStepSize,
    indexPatternId: null,
    predecessorCount: 0,
    successorCount: 0,
    sort: [],
  };
}
