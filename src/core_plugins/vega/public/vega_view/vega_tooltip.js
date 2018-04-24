import compactStringify from 'json-stringify-pretty-compact';
import { calculatePopoverPosition } from '@elastic/eui';

// Some of this code was adapted from https://github.com/vega/vega-tooltip

const tooltipId = 'vega-kibana-tooltip';

// FIXME: Is there a kibana utility function for this?
function escapeHTML(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/**
 * The tooltip handler class.
 */
export class TooltipHandler {
  constructor(view, position) {
    view.tooltip(this.handler.bind(this));
    this.position = position;
  }

  /**
   * The handler function.
   */
  handler(handler, event, item, value) {
    let el = document.getElementById(tooltipId);

    // hide tooltip for null, undefined, or empty string values
    if (value == null || value === '') {
      if (el) el.remove();
      return;
    }

    const createElement = !el;
    if (createElement) {
      el = document.createElement('div');
      el.setAttribute('id', tooltipId);
      el.classList.add('euiToolTipPopover', 'euiToolTip', `euiToolTip--${this.position}`);
      if (createElement) {
        document.querySelector('body').appendChild(el);
      }
    }


    // FIXME!
    // el.innerHTML fails eslint with Unsafe assignment to innerHTML
    // Not sure how to do this properly


    // set the tooltip content
    el.innerHTML = this.formatValue(value);

    const anchorBounds = {
      // I would expect clientX/Y, but that shows incorrectly
      left: event.pageX,
      top: event.pageY,
      width: 0,
      height: 0
    };

    const pos = calculatePopoverPosition(anchorBounds, el.getBoundingClientRect(), this.position);

    el.setAttribute('style', `top: ${pos.top}px; left: ${pos.left}px`);
  }

  /**
   * Format the value to be shown in the toolip.
   *
   * @param value The value to show in the tooltip.
   */
  formatValue(value) {
    if (Array.isArray(value)) {
      return `[${value.map(v => escapeHTML(typeof v === 'string' ? v : compactStringify(v))).join(', ')}]`;
    }

    if (typeof value === 'object') {
      let content = '';

      const { title, ...rest } = value;

      if (title) {
        content += `<h2>${title}</h2>`;
      }

      content += '<table>';
      for (const key of Object.keys(rest)) {
        let val = (rest)[key];
        if (typeof val === 'object') {
          val = compactStringify(val);
        }

        content += `<tr><td class="key">${escapeHTML(key)}:</td><td class="value">${escapeHTML(val)}</td></tr>`;
      }
      content += `</table>`;

      return content;
    }

    return escapeHTML(String(value));
  }

}
