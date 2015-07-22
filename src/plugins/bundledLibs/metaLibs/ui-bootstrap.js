define(function (require) {
  require('angular');
  require('bower_components/angular-bootstrap/ui-bootstrap.js');

  return require('ui/modules')
  .get('kibana', ['ui.bootstrap'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  });

});
