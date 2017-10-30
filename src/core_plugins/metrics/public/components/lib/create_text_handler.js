import _ from 'lodash';
export default (handleChange) => {
  return (name, defaultValue) => (e) => {
    // IE preventDefault breaks input, but we still need top prevent enter from being pressed
    if (!detectIE() || e.keyCode === 13) e.preventDefault();

    const value = _.get(e, 'target.value', defaultValue);
    if (_.isFunction(handleChange)) {
      return handleChange({ [name]: value });
    }
  };
};

function detectIE() {
  const ua = window.navigator.userAgent;

  const msie = ua.indexOf('MSIE ');
  if (msie > 0) {
    // IE 10 or older => return version number
    return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
  }

  const trident = ua.indexOf('Trident/');
  if (trident > 0) {
    // IE 11 => return version number
    const rv = ua.indexOf('rv:');
    return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
  }

  const edge = ua.indexOf('Edge/');
  if (edge > 0) {
    // Edge (IE 12+) => return version number
    return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
  }

  // other browser
  return false;
}