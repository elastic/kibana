define(function (require) {
  require('angular');

  return require('ui/modules')
  .get('kibana', ['ui.bootstrap'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  });

});
