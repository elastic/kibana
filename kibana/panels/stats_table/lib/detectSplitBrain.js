define(function (require) {
  'use strict';
  var _ = require('lodash');
  return function (rawdata) {
    var results = { master: null, status: 'green', yellow: [], red: [], series: {} };
    var previousTime = null;
    var extractNodes = function (row) {
      return row.id;
    };

    // Aggergate the series into a single object where the key
    // is the timestamp and the value is an array of the events.
    _.each(rawdata.facets, function (facet, node) {
      _.each(facet.entries, function (entry) {
        var event = _.clone(entry);
        event.id = node;
        if (!_.isArray(results.series[entry.time])) {
          results.series[entry.time] = [];
        }
        results.series[entry.time].push(event);
      });
    });

    var times = _.keys(results.series).sort(); // get all the times
    var lastPeriod = _.last(times, 2); // retrieve the last 2
    var lastSeries = results.series[lastPeriod[1]]; // get the last entry 

    // Check to see that there is 2 entries for the last 2 periods. (possible red state)
    if (results.series[lastPeriod[0]].length > 1 && results.series[lastPeriod[1]].length > 1) {

      // Double check to see that the periods are consecutive
      var periodMatch = (lastPeriod[1]-lastPeriod[0] === 60000);

      // Check to see that the nodes match
      var firstPeriodNodes = _.map(results.series[lastPeriod[0]], extractNodes);
      var secondPeriodNodes = _.map(results.series[lastPeriod[1]], extractNodes);
      var involvedNodes = _.intersection(firstPeriodNodes, secondPeriodNodes);
      var nodeMatch = (involvedNodes.length > 1);

      // If everything matches then we have a red event.
      if (periodMatch && nodeMatch) {
        results.red.push({
          from: lastPeriod[0],
          to: lastPeriod[1],
          nodes: involvedNodes 
        });
      }
    }

    // If any of the series is within 60 secnods of each other then the 
    // status is set to yellow
    _.each(times, function (currentTime) {
      if (previousTime) {
        if (results.series[previousTime].length > 1 && results.series[currentTime].length > 1) {
          
          // Check to see that the periods are consecutive
          var periodMatch = (currentTime - previousTime === 60000);

          // Check to see that the nodes match
          var firstPeriodNodes = _.map(results.series[previousTime], extractNodes);
          var secondPeriodNodes = _.map(results.series[currentTime], extractNodes);
          var involvedNodes = _.intersection(firstPeriodNodes, secondPeriodNodes);
          var nodeMatch = (involvedNodes.length > 1);

          // If everything matches then we have a yellow event
          if (periodMatch && nodeMatch) {

            // Dedup using the red events so we don't have red events in yellow 
            var redCheck = _.find(results.red, { from: previousTime, to: currentTime });
            
            // Not in red then add to yellow.
            if (!redCheck) {
              results.yellow.push({
                from: previousTime,
                to: currentTime,
                nodes: _.map(results.series[currentTime], extractNodes)
              });
            }
          }
        }
      }
      previousTime = currentTime;
    });


    // Set the status color
    if (results.red.length !== 0) {
      results.status = 'red';
    } else if (results.yellow.length !== 0) {
      results.status = 'yellow';
    }

    // If the last series is greater then on we need to figure
    // out who is the master by using max to determine last one
    // to report. If the status is red then we are going to mark
    // all the nodes as master.
    if (lastSeries.length > 1) {
      // Mark everything as master
      if (results.status === 'red') {
        results.master = results.red[0].nodes;
      // Mark the newest node as master
      } else {
        results.master = [_.max(lastSeries, function (row) {
          return row.max;
        }).id];
      }
    // There shall only be one!
    }  else {
      results.master = [lastSeries[0].id];
    }

    return results;

  }; 
});
