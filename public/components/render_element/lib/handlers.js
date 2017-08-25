export class ElementHandlers {
  constructor() {
    this.resize = () => {};
    this.destroy = () => {};
  }

  onResize(fn) {
    this.resize = fn;
  }

  onDestroy(fn) {
    this.destroy = fn;
  }
}
