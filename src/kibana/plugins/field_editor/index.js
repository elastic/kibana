define(function (require) {

  require('plugins/field_editor/field_editor');

  require('routes')
  .when('/settings/indices/:indexPatternId/field/:fieldName', {
    template: require('text!plugins/field_editor/route.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.indexPatternId)
        .catch(courier.redirectWhenMissing('/settings/indices'));
      }
    },
    controllerAs: 'fieldEditorRoute',
    controller: function ($route) {
      // expose route parameters to the template
      this.indexPattern = $route.current.locals.indexPattern;
      this.field = this.indexPattern.fields.byName[$route.current.params.fieldName];
    }
  });

});
