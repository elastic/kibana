
class VisController {
  constructor(el) {
    this.el = el;
    this._previousStates = [];
  }

  render(vis, visData) {

    return new Promise(resolve => {
      const id = window.location.href;
      const visited = this._previousStates.some((state) => {
        return state.id === id;
      });

      if (!visited) {
        const filters = vis.API.queryFilter.getFilters();
        const display = JSON.stringify(filters);
        const state = {
          id: id,
          display: display
        };
        this._previousStates.push(state);
      }

      const list = document.createElement('ul');
      this._previousStates.slice().reverse().forEach((state, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<a href=${state.id}>${this._previousStates.length - i}: ${state.display}</a>`;
        list.appendChild(li);
      });

      this.el.innerHTML = '';
      this.el.appendChild(list);
      resolve('when done rendering');
    });
  }

  resize() {
    console.log('resizing visualization');
  }

  destroy() {
    console.log('destroying vis');
  }
}

export { VisController };
