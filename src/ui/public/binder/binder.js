import d3 from 'd3';
import $ from 'jquery';

import { BinderBase } from '../../../utils/binder';

export class Binder extends BinderBase {
  constructor($scope) {
    super();

    // support auto-binding to $scope objects
    if ($scope) {
      $scope.$on('$destroy', () => this.destroy());
    }
  }

  jqOn(el, ...args) {
    const $el = $(el);
    $el.on(...args);
    this.disposal.push(() => $el.off(...args));
  }

  fakeD3Bind(el, event, handler) {
    this.jqOn(el, event, (e) => {
      // mimick https://github.com/mbostock/d3/blob/3abb00113662463e5c19eb87cd33f6d0ddc23bc0/src/selection/on.js#L87-L94
      const o = d3.event; // Events can be reentrant (e.g., focus).
      d3.event = e;
      try {
        handler.apply(this, [this.__data__]);
      } finally {
        d3.event = o;
      }
    });
  }
}
