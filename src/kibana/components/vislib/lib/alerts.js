define(function (require) {
  return function AlertsFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));
    /**
     * Appends chart titles to the visualization
     *
     * @class Alerts
     * @constructor
     * @param el {HTMLElement} Reference to DOM element
     */

    function Alerts(vis, data, alertDefs) {
      if (!(this instanceof Alerts)) {
        return new Alerts(vis, data, alertDefs);
      }

      this.vis = vis;
      this.data = data;
      this.alertDefs = alertDefs || [];

      $(vis.el).on('mouseenter', '.vis-alerts-tray', function () {
        var $tray = $(this);
        hide();
        $(vis.el).on('mousemove', checkForExit);

        function hide() {
          $tray.css({
            'pointer-events': 'none',
            opacity: 0.3
          });
        }

        function show() {
          $(vis.el).off('mousemove', checkForExit);
          $tray.css({
            'pointer-events': 'auto',
            opacity: 1
          });
        }

        function checkForExit(event) {
          var pos = $tray.offset();
          if (pos.top > event.clientY || pos.left > event.clientX) return show();

          var bottom = pos.top + $tray.height();
          if (event.clientY > bottom) return show();

          var right = pos.left + $tray.width();
          if (event.clientX > right) return show();
        }
      });
    }

    /**
     * Renders chart titles
     *
     * @method render
     * @returns {D3.Selection|D3.Transition.Transition} DOM element with chart titles
     */
    Alerts.prototype.render = function () {
      var vis = this.vis;
      var data = this.data;

      var alerts = _(this.alertDefs)
      .map(function (alertDef) {
        if (!alertDef) return;
        if (alertDef.test && !alertDef.test(vis, data)) return;

        var type = alertDef.type || 'info';
        var icon = alertDef.icon || type;
        var msg = alertDef.msg;

        // alert container
        var $icon = $('<i>').addClass('vis-alerts-icon fa fa-' + icon);
        var $text = $('<p>').addClass('vis-alerts-text').text(msg);

        return $('<div>').addClass('vis-alert vis-alert-' + type).append([$icon, $text]);
      })
      .compact();

      if (!alerts.size()) return;

      $(vis.el).find('.vis-alerts').append(
        $('<div>').addClass('vis-alerts-tray').append(alerts.value())
      );
    };

    return Alerts;
  };
});
