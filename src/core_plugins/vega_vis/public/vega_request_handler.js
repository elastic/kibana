export function VegaRequestHandlerProvider() {
  return {
    name: 'vegavis',
    handler: (/*vis, appState, uiState, queryFilter*/) => {
      // return different data when handler is called so vega visualization can watch visData
      return Promise.resolve(Date.now());
    }
  };
}
