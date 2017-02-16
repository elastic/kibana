export function createInitialQueryParametersState(defaultStepSize) {
  return {
    anchorUid: null,
    columns: [],
    defaultStepSize,
    indexPattern: null,
    predecessorCount: 0,
    successorCount: 0,
    sort: [],
  };
}
