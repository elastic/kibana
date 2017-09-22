export const defaultIdent = 'canvas--fullscreen';

const _listeners = [];

function requestFullscreen(el) {
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
  if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  return false;
}

function getFullscreenElement(doc) {
  if (typeof doc.fullScreenElement !== 'undefined') {
    return doc.fullScreenElement;
  }

  if (typeof doc.msFullscreenElement !== 'undefined') {
    return doc.msFullscreenElement;
  }

  if (typeof doc.mozFullScreenElement !== 'undefined') {
    return doc.mozFullScreenElement;
  }

  if (typeof doc.webkitFullscreenElement !== 'undefined') {
    return doc.webkitFullscreenElement;
  }

  return false;
}

export function canFullscreen(el) {
  return typeof el.requestFullscreen === 'function'
    || typeof el.msRequestFullscreen === 'function'
    || typeof el.mozRequestFullScreen === 'function'
    || typeof el.webkitRequestFullscreen === 'function';
}

export function createHandler(ident = defaultIdent, doc = document) {
  const el = doc.getElementById && doc.getElementById(ident);

  // TODO: tell the user something failed, at least in dev mode
  if (!el || !canFullscreen(el)) return false;

  return (ev) => {
    ev && ev.preventDefault();

    // check to see if any element is already fullscreen, do nothing if so
    if (getFullscreenElement(doc)) return;

    // nothing is already fullscreen, and we have a setter; call it
    requestFullscreen(el);
  };
}

export function createListener(fn) {
  _listeners.push(fn);

  return function removeListener() {
    const index = _listeners.findIndex(listener => listener === fn);
    _listeners.splice(index, 1);
  };
}

export function initialize(doc = document) {
  const checks = [
    'onfullscreenchange',
    'onmsfullscreenchange',
    'onmozfullscreenchange',
    'onwebkitfullscreenchange',
  ];

  for (const m in checks) {
    if (typeof doc[checks[m]] !== 'undefined') {
      if (doc[checks[m]] === null) {
        doc[checks[m]] = (ev) => {
          const el = getFullscreenElement(doc);
          const payload = {
            fullscreen: Boolean(el),
            target: ev.target,
            element: el,
          };

          // _emitter.emit('onfullscreenchange', payload);
          _listeners.forEach((listener) => {
            listener.call(null, payload);
          });
        };
      }
    }
  }
}
