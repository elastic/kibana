const URL_MAX_IE = 2000;
const URL_MAX_OTHERS = 25000;
const IE_REGEX = /(;MSIE |Edge\/\d)/;

export class UrlOverflowService {
  constructor() {
    const key = 'error/url-overflow/url';
    const store = window.sessionStorage || {
      getItem() {},
      setItem() {},
      removeItem() {},
    };

    // FIXME: Couldn't find a way to test for browser compatibility without
    // complex redirect and cookie based "feature-detection" page, so going
    // with user-agent detection for now.
    this._ieLike = IE_REGEX.test(window.navigator.userAgent);

    this._val = store.getItem(key);
    this._sync = () => {
      if (this._val == null) store.removeItem(key);
      else store.setItem(key, this._val);
    };
  }

  failLength() {
    return this._ieLike ? URL_MAX_IE : URL_MAX_OTHERS;
  }

  set(v) {
    this._val = v;
    this._sync();
  }

  get() {
    return this._val;
  }

  check(absUrl) {
    if (!this.get()) {
      const urlLength = absUrl.length;
      const remaining = this.failLength() - urlLength;

      if (remaining > 0) {
        return remaining;
      }

      this.set(absUrl);
    }

    throw new Error(`
      The URL has gotten too big and kibana can no longer
      continue. Please refresh to return to your previous state.
    `);
  }

  clear() {
    this._val = undefined;
    this._sync();
  }
}

export function UrlOverflowServiceProvider() {
  return new UrlOverflowService();
}
