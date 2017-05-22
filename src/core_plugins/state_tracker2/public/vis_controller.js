
class VisController {
  constructor(el) {
    console.log('recreate');
    this.el = el;
    this._previousStates = [];
  }

  render(vis, visData) {
    console.log('rendering');
    return new Promise(resolve => {
      const state = {};
      this._previousStates.push(state);
      this.el.innerHTML = `now has ${this._previousStates.length} states`;
      resolve('when done rendering');
    });
  }

  resize() {
    console.log('resizing visualization');
  }

  destroy() {
    console.log('destroying vis');
  }
};

export { VisController };
