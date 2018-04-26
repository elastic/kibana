import { calculatePopoverPosition } from '@elastic/eui';
import { formatValue as createTooltipContent, escapeHTML } from 'vega-tooltip';

// Some of this code was adapted from https://github.com/vega/vega-tooltip

const tooltipId = 'vega-kibana-tooltip';

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
    if (el) el.remove();

    // hide tooltip for null, undefined, or empty string values
    if (value == null || value === '') {
      return;
    }

    el = document.createElement('div');
    el.setAttribute('id', tooltipId);
    el.classList.add('euiToolTipPopover', 'euiToolTip', `euiToolTip--${this.position}`);

    // Desired, sanitized HTML is created by the tooltip library,
    // with a largue nmuber of tests, hence supressing eslint here.
    // eslint-disable-next-line no-unsanitized/property
    el.innerHTML = createTooltipContent(value, escapeHTML);

    // add to DOM to calculate tooltip size
    document.body.appendChild(el);

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

}
