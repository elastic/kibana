class StateVisualization {
  constructor(container) {
    this._container = container;
  }

  render(vis, esResponse) {
    return new Promise((resolve)=> {
      console.log('done rendering', vis);
      window._vis = vis;
      this._container.innerHTML = Date.now();
      resolve(true);
    });
  }

  destroy() {
    this._container.innerHTML = '';
  }
}


export {StateVisualization};
