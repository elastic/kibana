export function ElementHandlers() {}

ElementHandlers.prototype = {
  e: {
    resize: () => {},
    destroy: () => {},
  },

  onResize(fn) {
    const e = this.e || (this.e = {});
    if (fn) e.resize = fn;

    return this;
  },

  onDestroy(fn) {
    const e = this.e || (this.e = {});
    if (fn) e.destroy = fn;

    return this;
  },
};
