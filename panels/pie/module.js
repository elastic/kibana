angular.module('kibana.pie', [])
.controller('pie', function($scope, eventBus) {

  // Set and populate defaults
  var _d = {
    query   : { field:"_all", query:"*", goal: 1}, 
    size    : 10,
    exclude : [],
    donut   : false,
    tilt    : false,
    legend  : true,
    labels  : true,
    mode    : "terms",
    group   : "default",
    default_field : '_all',
    spyable : true,
  }
  _.defaults($scope.panel,_d)

  $scope.init = function() {
    eventBus.register($scope,'time', function(event,time){set_time(time)});
    eventBus.register($scope,'query', function(event, query) {
      if($scope.panel.mode !== 'query') {
        $scope.panel.query.query = query;
        $scope.panel.query.query = _.isArray(query) ? query[0] : query;
      } else {
        if(_.isArray(query))
          $scope.panel.query = _.map(query,function(q) {
            return {query: q, label: q}}) 
        else
          $scope.panel.query[0] = {query: query, label: query}
      }
      $scope.get_data();
    });
    // Now that we're all setup, request the time from our group
    eventBus.broadcast($scope.$id,$scope.panel.group,'get_time')
  }


  $scope.remove_query = function(q) {
    if($scope.panel.mode !== 'query') 
      return false;
    $scope.panel.query = _.without($scope.panel.query,q);
    $scope.get_data();
  }

  $scope.add_query = function(label,query) {
    if($scope.panel.mode !== 'query') 
      return false;
    $scope.panel.query.unshift({
      query: query,
      label: label, 
    });
    $scope.get_data();
  }

  $scope.set_mode = function(mode) {
    switch(mode)
    {
    case 'terms':
      $scope.panel.query = {query:"*",field:"_all"};
      break;
    case 'query':
      $scope.panel.query = [{query:"*",label:"*"}];
      break;
    case 'goal':
      $scope.panel.query = {query:"*",goal:100};
      break;
    }
  }

  $scope.get_data = function() {
    // Make sure we have everything for the request to complete
    if(_.isUndefined($scope.panel.index) || _.isUndefined($scope.time))
      return

    $scope.panel.loading = true;
    var request = $scope.ejs.Request().indices($scope.panel.index);

    // If we have an array, use query facet
    if($scope.panel.mode == "query") {
      if(!(_.isArray($scope.panel.query)))
        $scope.panel.query = [$scope.panel.query];
      var queries = [];
      // Build the question part of the query
      _.each($scope.panel.query, function(v) {
        queries.push(ejs.FilteredQuery(
          ejs.QueryStringQuery(v.query || '*'),
          ejs.RangeFilter($scope.time.field)
            .from($scope.time.from)
            .to($scope.time.to))
        )
      });

      // Then the insert into facet and make the request
      _.each(queries, function(v) {
        request = request.facet(ejs.QueryFacet(_.indexOf(queries,v))
          .query(v)
          .facetFilter(ejs.QueryFilter(v))
        )
      })
      $scope.populate_modal(request);
      var results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {
        $scope.panel.loading = false;
        $scope.hits = results.hits.total;
        $scope.data = [];
        _.each(results.facets, function(v, k) {
          var series = {};
          var label = _.isUndefined($scope.panel.query[k].label) ? 
            $scope.panel.query[k].query : $scope.panel.query[k].label 
          var slice = { label : label, data : v.count }; 
          if (!(_.isUndefined($scope.panel.query[k].color)))
            slice.color = $scope.panel.query[k].color;
          $scope.data.push(slice)
        });
        $scope.$emit('render');
      });
    // If we don't have an array, assume its a term facet.
    } else if ($scope.panel.mode == "terms") {
      request = request
        .facet(ejs.TermsFacet('pie')
          .field($scope.panel.query.field || $scope.panel.default_field)
          .size($scope.panel['size'])
          .exclude($scope.panel.exclude)
          .facetFilter(ejs.QueryFilter(
            ejs.FilteredQuery(
              ejs.QueryStringQuery($scope.panel.query.query || '*'),
              ejs.RangeFilter($scope.time.field)
                .from($scope.time.from)
                .to($scope.time.to)
                .cache(false)
              )))).size(0)

      $scope.populate_modal(request);

      var results = request.doSearch();

      // Populate scope when we have results
      results.then(function(results) {
        $scope.panel.loading = false;
        $scope.hits = results.hits.total;
        $scope.data = [];
        var k = 0;
        _.each(results.facets.pie.terms, function(v) {
          var slice = { label : v.term, data : v.count }; 
          $scope.data.push();
          if(!(_.isUndefined($scope.panel.colors)) 
            && _.isArray($scope.panel.colors)
            && $scope.panel.colors.length > 0) {
            slice.color = $scope.panel.colors[k%$scope.panel.colors.length];
          } 
          $scope.data.push(slice)
          k = k + 1;
        });
        $scope.$emit('render');
      });
    } else {
      request = request
        .query(ejs.QueryStringQuery($scope.panel.query.query || '*'))
        .filter(ejs.RangeFilter($scope.time.field)
          .from($scope.time.from)
          .to($scope.time.to)
          .cache(false))
        .size(0)
      
      $scope.populate_modal(request);
 
      var results = request.doSearch();

      results.then(function(results) {
        $scope.panel.loading = false;
        var complete  = results.hits.total;
        var remaining = $scope.panel.query.goal - complete;
        $scope.data = [
          { label : 'Complete', data : complete, color: '#51A351' },
          { data : remaining, color: '#EEE'}]
        $scope.$emit('render');
      });
    }
  }

  // I really don't like this function, too much dom manip. Break out into directive?
  $scope.populate_modal = function(request) {
    $scope.modal = {
      title: "Inspector",
      body : "<h5>Last Elasticsearch Query</h5><pre>"+
          'curl -XGET '+config.elasticsearch+'/'+$scope.panel.index+"/_search?pretty -d'\n"+
          angular.toJson(JSON.parse(request.toString()),true)+
        "'</pre>", 
    } 
  }

  $scope.build_search = function(field,value) {
    $scope.panel.query.query = add_to_query($scope.panel.query.query,field,value,false)
    $scope.get_data();
    eventBus.broadcast($scope.$id,$scope.panel.group,'query',$scope.panel.query.query);
  }

  function set_time(time) {
    $scope.time = time;
    $scope.panel.index = _.isUndefined(time.index) ? $scope.panel.index : time.index
    $scope.get_data();
  }
  
})
.directive('pie', function() {
  return {
    restrict: 'A',
    link: function(scope, elem, attrs) {

      elem.html('<center><img src="common/img/load_big.gif"></center>')

      // Receive render events
      scope.$on('render',function(){
        render_panel();
      });

      // Or if the window is resized
      angular.element(window).bind('resize', function(){
        render_panel();
      });

      // Function for rendering panel
      function render_panel() {
        var scripts = $LAB.script("common/lib/panels/jquery.flot.js")
                        .script("common/lib/panels/jquery.flot.pie.js")

        if(scope.panel.mode === 'goal')
          var label = { 
            show: scope.panel.labels,
            radius: 0,
            formatter: function(label, series){
              var font = parseInt(scope.row.height.replace('px',''))/10 + String('px')
              if(!(_.isUndefined(label)))
                return '<div style="font-size:'+font+';font-weight:bold;text-align:center;padding:2px;color:black;">'+
                Math.round(series.percent)+'%</div>';
              else
                return ''
            },
          }
        else 
          var label = { 
            show: scope.panel.labels,
            radius: 2/3,
            formatter: function(label, series){
              return '<div ng-click="build_search(panel.query.field,\''+label+'\') "style="font-size:8pt;text-align:center;padding:2px;color:white;">'+
                label+'<br/>'+Math.round(series.percent)+'%</div>';
            },
            threshold: 0.1 
          }

        var pie = {
          series: {
            pie: {
              innerRadius: scope.panel.donut ? 0.4 : 0,
              tilt: scope.panel.tilt ? 0.45 : 1,
              radius: 1,
              show: true,
              combine: {
                color: '#999',
                label: 'The Rest'
              },
              label: label
            }
          },
          //grid: { hoverable: true, clickable: true },
          grid:   { hoverable: true, clickable: true },
          legend: { show: false },
          colors: ['#86B22D','#BF6730','#1D7373','#BFB930','#BF3030','#77207D']
        };

        // Populate element
        if(elem.is(":visible")){
          scripts.wait(function(){
            var plot = $.plot(elem, scope.data, pie);
            scope.legend = [];
            _.each(plot.getData(),function(series) {
              var item = _.pick(series,'label','color','percent')
              item.percent = parseFloat(item.percent).toFixed(1)
              scope.legend.push(item)
            })
            console.log(scope.legend)
          });
        }
      }

      function piett(x, y, contents) {
        var tooltip = $('#pie-tooltip').length ? 
          $('#pie-tooltip') : $('<div id="pie-tooltip"></div>');
        tooltip.html(contents).css({
          position: 'absolute',
          top     : y + 10,
          left    : x + 10,
          color   : "#000",
          'font-weight': 200,
          'border-radius': '5px',
          border  : '2px solid #000',
          padding : '10px',
          'background-color': '#FFF',
        }).appendTo("body");
      }

      elem.bind("plotclick", function (event, pos, object) {
        if (!object)
          return;
        if(scope.panel.mode === 'terms')
          scope.build_search(scope.panel.query.field,object.series.label);
      });

      elem.bind("plothover", function (event, pos, item) {
        if (item) {
          var percent = parseFloat(item.series.percent).toFixed(1) + "%";
          piett(pos.pageX, pos.pageY, "<div style='vertical-align:middle;display:inline-block;background:"+item.series.color+";height:15px;width:15px;border-radius:10px;'></div> " + 
            (item.series.label||"")+ " " + percent);
        } else {
          $("#pie-tooltip").remove();
        }
      });

    }
  };
})