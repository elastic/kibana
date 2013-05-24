/*

  ## Hits

  A variety of representations of the hits a query matches

  ### Parameters
  * query ::  An array of queries. No labels here, just an array of strings. Maybe
              there should be labels. Probably. 
  * style :: A hash of css styles
  * arrangement :: How should I arrange the query results? 'horizontal' or 'vertical'
  * ago :: Date math formatted time to look back
  ### Group Events
  #### Sends
  * get_time :: On panel initialization get time range to query
  #### Receives
  * time :: An object containing the time range to use and the index(es) to query
  * query :: An Array of queries, even if its only one

*/
angular.module('kibana.trends', [])
.controller('trends', function($scope, eventBus, kbnIndex) {

  // Set and populate defaults
  var _d = {
    query   : ["*"],
    group   : "default",
    style   : { "font-size": '14pt'},
    ago     : '1d',
    arrangement : 'vertical',
  }
  _.defaults($scope.panel,_d)

  $scope.init = function () {
    $scope.hits = 0;
    eventBus.register($scope,'time', function(event,time){
      set_time(time)
    });
    eventBus.register($scope,'query', function(event, query) {
      $scope.panel.query = _.map(query,function(q) {
        return {query: q, label: q};
      })
      $scope.get_data();
    });
    // Now that we're all setup, request the time from our group
    eventBus.broadcast($scope.$id,$scope.panel.group,'get_time')
  }

  $scope.get_data = function(segment,query_id) {
    delete $scope.panel.error
    $scope.panel.loading = true;

    // Make sure we have everything for the request to complete
    if(_.isUndefined($scope.index) || _.isUndefined($scope.time))
      return

    $scope.old_time = {
      from : new Date($scope.time.from.getTime() - interval_to_seconds($scope.panel.ago)*1000),
      to   : new Date($scope.time.to.getTime() - interval_to_seconds($scope.panel.ago)*1000)
    }

    var _segment = _.isUndefined(segment) ? 0 : segment
    var request = $scope.ejs.Request();

    // Build the question part of the query
    var queries = [];
    _.each($scope.panel.query, function(v) {
      queries.push($scope.ejs.FilteredQuery(
        ejs.QueryStringQuery(v.query || '*'),
        ejs.RangeFilter($scope.time.field)
          .from($scope.time.from)
          .to($scope.time.to))
      )
    });

    // Build the facet part
    _.each(queries, function(v) {
      request = request
        .facet($scope.ejs.QueryFacet("new"+_.indexOf(queries,v))
          .query(v)
        ).size(0)
    })

    var queries = [];
    _.each($scope.panel.query, function(v) {
      queries.push($scope.ejs.FilteredQuery(
        ejs.QueryStringQuery(v.query || '*'),
        ejs.RangeFilter($scope.time.field)
          .from($scope.old_time.from)
          .to($scope.old_time.to))
      )
    });

    // Build the facet part
    _.each(queries, function(v) {
      request = request
        .facet($scope.ejs.QueryFacet("old"+_.indexOf(queries,v))
          .query(v)
        ).size(0)
    })

    // TODO: Spy for hits panel
    //$scope.populate_modal(request);

    // If we're on the first segment we need to get our indices
    if (_segment == 0) {
      kbnIndex.indices(
        $scope.old_time.from,
        $scope.old_time.to,
        $scope.time.pattern,
        $scope.time.interval
      ).then(function (p) {
        $scope.index = _.union(p,$scope.index);
        process_results(request.indices($scope.index[_segment]).doSearch());
      });
    } else {
      process_results(request.indices($scope.index[_segment]).doSearch());
    }

    // Populate scope when we have results
    function process_results(results) { 
      results.then(function(results) {

        $scope.panel.loading = false;
        if(_segment == 0) {
          $scope.hits = {};
          $scope.data = [];
          query_id = $scope.query_id = new Date().getTime();
        }
        
        // Check for error and abort if found
        if(!(_.isUndefined(results.error))) {
          $scope.panel.error = $scope.parse_error(results.error);
          return;
        }
        if($scope.query_id === query_id) {
          var i = 0;
          _.each($scope.panel.query, function(k) {
            var n = results.facets['new'+i].count
            var o = results.facets['old'+i].count

            var hits = {
              new : _.isUndefined($scope.data[i]) || _segment == 0 ? n : $scope.data[i].hits.new+n,        
              old : _.isUndefined($scope.data[i]) || _segment == 0 ? o : $scope.data[i].hits.old+o
            }
            
            $scope.hits.new += n;
            $scope.hits.old += o;

            var percent = percentage(hits.old,hits.new) == null ? 
              '?' : Math.round(percentage(hits.old,hits.new)*100)/100
            // Create series
            $scope.data[i] = { 
              label: $scope.panel.query[i].label || "query"+(parseInt(i)+1), 
              hits: {
                new : hits.new,
                old : hits.old
              },
              percent: percent
            };

            i++;
          });
          $scope.$emit('render');
          if(_segment < $scope.index.length-1) 
            $scope.get_data(_segment+1,query_id)
          else
            $scope.trends = $scope.data
        }
      });
    }

  }

  function percentage(x,y) {
    return x == 0 ? null : 100*(y-x)/x
  }

  $scope.remove_query = function(q) {
    $scope.panel.query = _.without($scope.panel.query,q);
    $scope.get_data();
  }

  $scope.add_query = function(label,query) {
    $scope.panel.query.unshift({
      query: query,
      label: label, 
    });
    $scope.get_data();
  }

  $scope.set_refresh = function (state) { 
    $scope.refresh = state; 
  }

  $scope.close_edit = function() {
    if($scope.refresh)
      $scope.get_data();
    $scope.refresh =  false;
    $scope.$emit('render');
  }

  function set_time(time) {
    $scope.time = time;
    $scope.index = time.index || $scope.index
    $scope.get_data();
  }

})