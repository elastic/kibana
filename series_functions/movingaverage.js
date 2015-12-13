var alter = require('../lib/alter.js');
var _ = require('lodash');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('movingaverage', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'window',
      types: ['number'],
      help: 'Number of points to average over'
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: "Position of the averaged points relative to the result's time.  Options are left, right, and center (default)."
    }
  ],
  aliases: ['mvavg'],
  help: 'Calculate the moving average over a given window. Nice for smoothing noisey series',
  fn: function movingaverageFn(args) {
    return alter(args, function (eachSeries, _window, _position) {

      _position = _position || "center";
      var validPositions = ['left', 'right', 'center']
      if (!_.contains(['left', 'right', 'center'], _position)) {
        throw new Error('Valid positions are: ' + validPositions.join(', '));
      }

      if(_position === "center") {
        
        var windowLeft = Math.floor( _window / 2);
        var windowRight = _window - windowLeft;

        var pairs = eachSeries.data;
      
        var pairsLen = pairs.length;
      
        eachSeries.label = eachSeries.label + ' mvavg=' + _window;
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i < windowLeft || i >= pairsLen - windowRight ) { return [point[0], null]; }

          var average = _.chain(pairs.slice(i - windowLeft, i + windowRight ))
          .map(function (point) {
            return point[1];
          }).reduce(function (memo, num) {
            return (memo + num);
          }).value() / _window;

          return [point[0], average];
        });
      
      } else if(_position === "left"){
        
        var pairs = eachSeries.data;
        eachSeries.label = eachSeries.label + ' mvavg=' + _window;
        eachSeries.data = _.map(pairs, function (point, i) {
          if (i < _window) { return [point[0], null]; }

          var average = _.chain(pairs.slice(i - _window, i))
          .map(function (point) {
            return point[1];
          }).reduce(function (memo, num) {
            return (memo + num);
          }).value() / _window;

          return [point[0], average];
        });
        
      } else if(_position === "right"){
        
        var pairs = eachSeries.data;
        var pairsLen = pairs.length;
        
        eachSeries.label = eachSeries.label + ' mvavg=' + _window;
        eachSeries.data = _.map(pairs, function (point, i) {
         if (i >= pairsLen - _window) { return [point[0], null]; }

         var average = _.chain(pairs.slice(i , i + _window))
         .map(function (point) {
           return point[1];
         }).reduce(function (memo, num) {
           return (memo + num);
         }).value() / _window;

         return [point[0], average];
        });

      }
      
      return eachSeries;
    });
  }
});
