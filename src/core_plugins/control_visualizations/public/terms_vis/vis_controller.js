
class VisController {
  constructor(el) {
    this.el = el;
  }

  render(vis, visData) {
    return new Promise(resolve => {
      console.log('rendering visualization');
      console.log('visData', visData);
      this.el.innerHTML = 'my new visualization';
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
